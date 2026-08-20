package com.deviceshield

import android.app.Activity
import android.content.Context
import android.hardware.display.DisplayManager
import android.os.Build
import android.provider.Settings
import android.view.Display
import android.view.WindowManager
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.UiThreadUtil
import com.facebook.react.bridge.WritableMap
import com.facebook.react.module.annotations.ReactModule
import java.io.File
import java.util.concurrent.Executor

@ReactModule(name = DeviceShieldModule.NAME)
class DeviceShieldModule(reactContext: ReactApplicationContext) :
  NativeDeviceShieldSpec(reactContext) {

  private val displayManager =
    reactContext.getSystemService(Context.DISPLAY_SERVICE) as DisplayManager

  @Volatile
  private var secureScreenEnabled = false

  private val mainExecutor = Executor { command -> UiThreadUtil.runOnUiThread(command) }

  /** Typed as Any so this class loads on API < 34 (no ScreenCaptureCallback in bytecode). */
  private var screenshotSupport: Any? = null

  private val displayListener = object : DisplayManager.DisplayListener {
    override fun onDisplayAdded(displayId: Int) = emitScreenRecordingChanged()
    override fun onDisplayRemoved(displayId: Int) = emitScreenRecordingChanged()
    override fun onDisplayChanged(displayId: Int) = emitScreenRecordingChanged()
  }

  init {
    displayManager.registerDisplayListener(displayListener, null)
  }

  override fun invalidate() {
    displayManager.unregisterDisplayListener(displayListener)
    unregisterScreenshotCallback()
    super.invalidate()
  }

  override fun isJailbroken(): Boolean = isRooted()

  override fun isRooted(): Boolean {
    return hasTestKeys() ||
      hasSuBinary() ||
      hasRootManagementApps() ||
      canExecuteSu() ||
      hasDangerousProps()
  }

  override fun isEmulator(): Boolean {
    val fingerprint = Build.FINGERPRINT.lowercase()
    val model = Build.MODEL.lowercase()
    val manufacturer = Build.MANUFACTURER.lowercase()
    val brand = Build.BRAND.lowercase()
    val device = Build.DEVICE.lowercase()
    val product = Build.PRODUCT.lowercase()
    val hardware = Build.HARDWARE.lowercase()
    val board = Build.BOARD.lowercase()

    return (fingerprint.startsWith("generic")
      || fingerprint.startsWith("unknown")
      || fingerprint.contains("emulator")
      || fingerprint.contains("vbox")
      || fingerprint.contains("test-keys")
      || model.contains("google_sdk")
      || model.contains("emulator")
      || model.contains("android sdk built for")
      || model.contains("droid4x")
      || manufacturer.contains("genymotion")
      || manufacturer.contains("bluestacks")
      || manufacturer.contains("nox")
      || (brand.startsWith("generic") && device.startsWith("generic"))
      || product.contains("sdk")
      || product.contains("sdk_gphone")
      || product.contains("google_sdk")
      || product.contains("sdk_x86")
      || product.contains("vbox")
      || product.contains("emulator")
      || product.contains("simulator")
      || hardware.contains("goldfish")
      || hardware.contains("ranchu")
      || hardware.contains("vbox")
      || board.contains("nox")
      || Build.HOST.lowercase().contains("buildfarm")
      || Settings.Global.getString(
        reactApplicationContext.contentResolver,
        Settings.Global.DEVICE_NAME
      )?.lowercase()?.contains("emulator") == true)
  }

  override fun isScreenRecording(): Boolean {
    return hasSuspiciousVirtualDisplay()
  }

  override fun isSecureScreenEnabled(): Boolean = secureScreenEnabled

  override fun enableSecureScreen() {
    secureScreenEnabled = true
    UiThreadUtil.runOnUiThread {
      val activity = reactApplicationContext.currentActivity ?: return@runOnUiThread
      activity.window?.addFlags(WindowManager.LayoutParams.FLAG_SECURE)
      registerScreenshotCallback(activity)
    }
  }

  override fun disableSecureScreen() {
    secureScreenEnabled = false
    UiThreadUtil.runOnUiThread {
      val activity = reactApplicationContext.currentActivity ?: return@runOnUiThread
      activity.window?.clearFlags(WindowManager.LayoutParams.FLAG_SECURE)
      unregisterScreenshotCallback()
    }
  }

  override fun setNativePrivacyOverlayEnabled(enabled: Boolean) {
    // Android FLAG_SECURE already blanks screenshots / recents.
    // JS overlays are preferred for custom UI.
  }

  override fun getSecurityStatus(): WritableMap {
    val jailbroken = isJailbroken()
    val rooted = isRooted()
    val emulator = isEmulator()
    val recording = isScreenRecording()

    return Arguments.createMap().apply {
      putBoolean("isJailbroken", jailbroken)
      putBoolean("isRooted", rooted)
      putBoolean("isEmulator", emulator)
      putBoolean("isScreenRecording", recording)
      putBoolean("isSecureScreenEnabled", secureScreenEnabled)
      putBoolean("isPrivacyMode", recording)
      putBoolean("isCompromised", jailbroken || rooted || emulator)
      putString("platform", "android")
    }
  }

  private fun registerScreenshotCallback(activity: Activity) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
      return
    }
    if (screenshotSupport != null) {
      return
    }
    val support = ScreenCaptureCallbackCompat.create { emitScreenshotDetected() } ?: return
    ScreenCaptureCallbackCompat.register(support, activity, mainExecutor)
    screenshotSupport = support
  }

  private fun unregisterScreenshotCallback() {
    ScreenCaptureCallbackCompat.unregister(screenshotSupport)
    screenshotSupport = null
  }

  private fun emitScreenRecordingChanged() {
    if (!reactApplicationContext.hasActiveReactInstance()) {
      return
    }

    val payload = Arguments.createMap().apply {
      putBoolean("isScreenRecording", isScreenRecording())
    }
    emitOnScreenRecordingChanged(payload)
  }

  private fun emitScreenshotDetected() {
    if (!reactApplicationContext.hasActiveReactInstance()) {
      return
    }

    val payload = Arguments.createMap().apply {
      putBoolean("prevented", secureScreenEnabled)
    }
    emitOnScreenshotDetected(payload)
  }

  private fun hasSuspiciousVirtualDisplay(): Boolean {
    val displays = displayManager.displays ?: return false

    return displays.any { display ->
      if (display.displayId == Display.DEFAULT_DISPLAY) {
        return@any false
      }

      val name = display.name?.lowercase().orEmpty()
      val flags = display.flags

      name.contains("screen") ||
        name.contains("record") ||
        name.contains("capture") ||
        name.contains("virtual") ||
        name.contains("cast") ||
        name.contains("mirror") ||
        name.contains("scrcpy") ||
        (flags and Display.FLAG_PRESENTATION) != 0
    }
  }

  private fun hasTestKeys(): Boolean {
    return Build.TAGS?.contains("test-keys") == true
  }

  private fun hasSuBinary(): Boolean {
    val paths = arrayOf(
      "/system/bin/su",
      "/system/xbin/su",
      "/sbin/su",
      "/system/su",
      "/system/bin/.ext/.su",
      "/system/usr/we-need-root/su-backup",
      "/system/xbin/mu",
      "/data/local/su",
      "/data/local/bin/su",
      "/data/local/xbin/su",
      "/system/sd/xbin/su",
      "/system/bin/failsafe/su",
      "/su/bin/su",
      "/su/bin",
      "/magisk/.core/bin/su"
    )
    return paths.any { File(it).exists() }
  }

  private fun hasRootManagementApps(): Boolean {
    val packages = arrayOf(
      "com.noshufou.android.su",
      "com.noshufou.android.su.elite",
      "eu.chainfire.supersu",
      "com.koushikdutta.superuser",
      "com.thirdparty.superuser",
      "com.yellowes.su",
      "com.topjohnwu.magisk",
      "com.kingroot.kinguser",
      "com.kingo.root",
      "com.smedialink.oneclickroot",
      "com.zhiqupk.root.global",
      "com.alephzain.framaroot"
    )

    val pm = reactApplicationContext.packageManager
    return packages.any { pkg ->
      try {
        pm.getPackageInfo(pkg, 0)
        true
      } catch (_: Exception) {
        false
      }
    }
  }

  private fun canExecuteSu(): Boolean {
    return try {
      Runtime.getRuntime().exec(arrayOf("which", "su")).inputStream.bufferedReader()
        .use { it.readLine() } != null
    } catch (_: Exception) {
      false
    }
  }

  private fun hasDangerousProps(): Boolean {
    return listOf("ro.debuggable", "ro.secure").any { key ->
      try {
        val process = Runtime.getRuntime().exec(arrayOf("getprop", key))
        val value = process.inputStream.bufferedReader().use { it.readLine() }
        when (key) {
          "ro.debuggable" -> value == "1"
          "ro.secure" -> value == "0"
          else -> false
        }
      } catch (_: Exception) {
        false
      }
    }
  }

  companion object {
    const val NAME = "DeviceShield"
  }
}
