package com.deviceshield

import android.app.Activity
import android.os.Build
import java.util.concurrent.Executor
import kotlin.jvm.functions.Function0

/**
 * Loads [ScreenCaptureCallbackSupport] only on API 34+ via reflection so
 * DeviceShieldModule never references Activity.ScreenCaptureCallback in its
 * bytecode (that class is missing on older Android and crashes module init).
 */
internal object ScreenCaptureCallbackCompat {
  fun create(onCapture: () -> Unit): Any? {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
      return null
    }

    return try {
      val clazz = Class.forName("com.deviceshield.ScreenCaptureCallbackSupport")
      val ctor = clazz.getConstructor(Function0::class.java)
      ctor.newInstance(onCapture as Function0<*>)
    } catch (_: Throwable) {
      null
    }
  }

  fun register(support: Any?, activity: Activity, executor: Executor) {
    if (support == null) {
      return
    }
    try {
      support.javaClass
        .getMethod("register", Activity::class.java, Executor::class.java)
        .invoke(support, activity, executor)
    } catch (_: Throwable) {
      // ignore
    }
  }

  fun unregister(support: Any?) {
    if (support == null) {
      return
    }
    try {
      support.javaClass.getMethod("unregister").invoke(support)
    } catch (_: Throwable) {
      // ignore
    }
  }
}
