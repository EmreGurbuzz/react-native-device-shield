package com.deviceshield

import android.app.Activity
import android.os.Build
import android.annotation.TargetApi
import java.util.concurrent.Executor

/**
 * Only loaded on API 34+ (via Class.forName from ScreenCaptureCallbackCompat).
 */
@TargetApi(Build.VERSION_CODES.UPSIDE_DOWN_CAKE)
internal class ScreenCaptureCallbackSupport(
  private val onCapture: () -> Unit
) {
  private val callback = Activity.ScreenCaptureCallback {
    onCapture()
  }

  private var registered = false
  private var registeredActivity: Activity? = null

  fun register(activity: Activity, executor: Executor) {
    if (registered) {
      return
    }
    try {
      activity.registerScreenCaptureCallback(executor, callback)
      registeredActivity = activity
      registered = true
    } catch (_: Exception) {
      // Activity may already have registered or be finishing
    }
  }

  fun unregister() {
    if (!registered) {
      return
    }
    val activity = registeredActivity
    registeredActivity = null
    registered = false
    if (activity == null) {
      return
    }
    try {
      activity.unregisterScreenCaptureCallback(callback)
    } catch (_: Exception) {
      // ignore
    }
  }
}
