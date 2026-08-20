#import "DeviceShield.h"

#import <UIKit/UIKit.h>
#import <sys/stat.h>
#import <mach-o/dyld.h>

@interface DeviceShield ()
@property (nonatomic, assign) BOOL secureScreenEnabled;
@property (nonatomic, assign) BOOL nativePrivacyOverlayEnabled;
@property (nonatomic, assign) BOOL secureLayerApplied;
@property (nonatomic, strong, nullable) UIView *privacyCover;
@property (nonatomic, strong, nullable) UITextField *secureField;
@property (nonatomic, weak, nullable) UIView *securedRootView;
@property (nonatomic, weak, nullable) UIView *securedRootParent;
@end

@implementation DeviceShield

- (instancetype)init {
  if (self = [super init]) {
    _secureScreenEnabled = NO;
    _nativePrivacyOverlayEnabled = NO;
    _secureLayerApplied = NO;
    [[NSNotificationCenter defaultCenter]
        addObserver:self
           selector:@selector(handleCapturedDidChange:)
               name:UIScreenCapturedDidChangeNotification
             object:nil];
    [[NSNotificationCenter defaultCenter]
        addObserver:self
           selector:@selector(handleUserDidTakeScreenshot:)
               name:UIApplicationUserDidTakeScreenshotNotification
             object:nil];
    [[NSNotificationCenter defaultCenter]
        addObserver:self
           selector:@selector(handleWillResignActive:)
               name:UIApplicationWillResignActiveNotification
             object:nil];
    [[NSNotificationCenter defaultCenter]
        addObserver:self
           selector:@selector(handleDidBecomeActive:)
               name:UIApplicationDidBecomeActiveNotification
             object:nil];
  }
  return self;
}

- (void)dealloc {
  [[NSNotificationCenter defaultCenter] removeObserver:self];
}

+ (BOOL)requiresMainQueueSetup {
  return YES;
}

- (void)handleCapturedDidChange:(NSNotification *)notification {
  BOOL recording = [self isScreenRecordingValue];
  if (self.secureScreenEnabled && self.nativePrivacyOverlayEnabled) {
    if (recording) {
      [self showPrivacyCover];
    } else {
      [self hidePrivacyCover];
    }
  }

  [self emitOnScreenRecordingChanged:@{
    @"isScreenRecording" : @(recording)
  }];
}

- (void)handleUserDidTakeScreenshot:(NSNotification *)notification {
  [self emitOnScreenshotDetected:@{
    @"prevented" : @(self.secureScreenEnabled && self.secureLayerApplied)
  }];
}

- (void)handleWillResignActive:(NSNotification *)notification {
  if (self.secureScreenEnabled && self.nativePrivacyOverlayEnabled) {
    [self showPrivacyCover];
  }
}

- (void)handleDidBecomeActive:(NSNotification *)notification {
  if (self.secureScreenEnabled && self.nativePrivacyOverlayEnabled &&
      ![self isScreenRecordingValue]) {
    [self hidePrivacyCover];
  }
  if (self.secureScreenEnabled && !self.secureLayerApplied) {
    [self scheduleSecureLayerApply];
  }
}

- (BOOL)isScreenRecordingValue {
  return UIScreen.mainScreen.isCaptured;
}

- (UIWindow *)keyWindow {
  NSSet<UIScene *> *scenes = UIApplication.sharedApplication.connectedScenes;
  for (UIScene *scene in scenes) {
    if (scene.activationState != UISceneActivationStateForegroundActive &&
        scene.activationState != UISceneActivationStateForegroundInactive) {
      continue;
    }
    if (![scene isKindOfClass:[UIWindowScene class]]) {
      continue;
    }
    UIWindowScene *windowScene = (UIWindowScene *)scene;
    for (UIWindow *window in windowScene.windows) {
      if (window.isKeyWindow) {
        return window;
      }
    }
    if (windowScene.windows.count > 0) {
      return windowScene.windows.firstObject;
    }
  }
  return UIApplication.sharedApplication.windows.firstObject;
}

- (NSNumber *)isJailbroken {
  return @([self detectJailbreak]);
}

- (NSNumber *)isRooted {
  return @([self detectJailbreak]);
}

- (NSNumber *)isEmulator {
#if TARGET_OS_SIMULATOR
  return @YES;
#else
  NSString *model = UIDevice.currentDevice.model ?: @"";
  if ([model.lowercaseString containsString:@"simulator"]) {
    return @YES;
  }
  return @NO;
#endif
}

- (NSNumber *)isScreenRecording {
  return @([self isScreenRecordingValue]);
}

- (NSNumber *)isSecureScreenEnabled {
  return @(self.secureScreenEnabled);
}

- (void)showPrivacyCover {
  if (!self.nativePrivacyOverlayEnabled) {
    return;
  }

  dispatch_async(dispatch_get_main_queue(), ^{
    UIWindow *window = [self keyWindow];
    if (window == nil) {
      return;
    }

    if (self.privacyCover == nil) {
      UIView *cover = [[UIView alloc] initWithFrame:window.bounds];
      cover.autoresizingMask =
          UIViewAutoresizingFlexibleWidth | UIViewAutoresizingFlexibleHeight;
      cover.backgroundColor = UIColor.blackColor;
      cover.userInteractionEnabled = YES;
      cover.tag = 0xDE51E10;
      self.privacyCover = cover;
    }

    self.privacyCover.frame = window.bounds;
    if (self.privacyCover.superview != window) {
      [window addSubview:self.privacyCover];
    }
    [window bringSubviewToFront:self.privacyCover];
  });
}

- (void)hidePrivacyCover {
  dispatch_async(dispatch_get_main_queue(), ^{
    [self.privacyCover removeFromSuperview];
  });
}

- (void)scheduleSecureLayerApply {
  dispatch_after(
      dispatch_time(DISPATCH_TIME_NOW, (int64_t)(0.35 * NSEC_PER_SEC)),
      dispatch_get_main_queue(), ^{
        [self applySecureLayerIfPossible];
      });
}

/**
 * Places the root view inside a secureTextEntry UITextField container so iOS
 * blanks screenshots / recordings of that content. Safer than reparenting
 * window.layer (which can crash).
 */
- (void)applySecureLayerIfPossible {
  if (self.secureLayerApplied || !self.secureScreenEnabled) {
    return;
  }

  UIWindow *window = [self keyWindow];
  UIView *rootView = window.rootViewController.view;
  UIView *parent = rootView.superview;
  if (window == nil || rootView == nil || parent == nil) {
    [self scheduleSecureLayerApply];
    return;
  }

  @try {
    UITextField *field = [[UITextField alloc] initWithFrame:parent.bounds];
    field.secureTextEntry = YES;
    field.backgroundColor = UIColor.clearColor;
    field.userInteractionEnabled = YES;
    field.autoresizingMask =
        UIViewAutoresizingFlexibleWidth | UIViewAutoresizingFlexibleHeight;

    UIView *secureContainer = field.subviews.firstObject;
    if (secureContainer == nil) {
      NSLog(@"[DeviceShield] secure container unavailable");
      return;
    }

    NSUInteger index = [parent.subviews indexOfObject:rootView];
    if (index == NSNotFound) {
      index = 0;
    }

    self.securedRootView = rootView;
    self.securedRootParent = parent;

    [rootView removeFromSuperview];
    [parent insertSubview:field atIndex:index];
    field.frame = parent.bounds;

    secureContainer.frame = field.bounds;
    secureContainer.autoresizingMask =
        UIViewAutoresizingFlexibleWidth | UIViewAutoresizingFlexibleHeight;
    [secureContainer addSubview:rootView];
    rootView.frame = secureContainer.bounds;
    rootView.autoresizingMask =
        UIViewAutoresizingFlexibleWidth | UIViewAutoresizingFlexibleHeight;

    self.secureField = field;
    self.secureLayerApplied = YES;
    NSLog(@"[DeviceShield] iOS secure layer applied");
  } @catch (NSException *exception) {
    NSLog(@"[DeviceShield] secure layer failed: %@", exception);
    self.secureLayerApplied = NO;
    self.secureField = nil;
  }
}

- (void)removeSecureLayerIfNeeded {
  if (!self.secureLayerApplied) {
    return;
  }

  @try {
    UIView *rootView = self.securedRootView;
    UIView *parent = self.securedRootParent ?: self.secureField.superview;
    if (rootView != nil && parent != nil) {
      [rootView removeFromSuperview];
      [parent addSubview:rootView];
      rootView.frame = parent.bounds;
      rootView.autoresizingMask =
          UIViewAutoresizingFlexibleWidth | UIViewAutoresizingFlexibleHeight;
    }
    [self.secureField removeFromSuperview];
  } @catch (NSException *exception) {
    NSLog(@"[DeviceShield] secure layer remove failed: %@", exception);
  }

  self.secureField = nil;
  self.securedRootView = nil;
  self.securedRootParent = nil;
  self.secureLayerApplied = NO;
}

- (void)enableSecureScreen {
  dispatch_async(dispatch_get_main_queue(), ^{
    self.secureScreenEnabled = YES;
    [self scheduleSecureLayerApply];
    if (self.nativePrivacyOverlayEnabled && [self isScreenRecordingValue]) {
      [self showPrivacyCover];
    }
  });
}

- (void)disableSecureScreen {
  dispatch_async(dispatch_get_main_queue(), ^{
    self.secureScreenEnabled = NO;
    [self removeSecureLayerIfNeeded];
    [self hidePrivacyCover];
  });
}

- (void)setNativePrivacyOverlayEnabled:(BOOL)enabled {
  dispatch_async(dispatch_get_main_queue(), ^{
    self.nativePrivacyOverlayEnabled = enabled;
    if (!enabled) {
      [self hidePrivacyCover];
    }
  });
}

- (NSDictionary *)getSecurityStatus {
  BOOL jailbroken = [self detectJailbreak];
  BOOL emulator = [self.isEmulator boolValue];
  BOOL recording = [self isScreenRecordingValue];

  return @{
    @"isJailbroken" : @(jailbroken),
    @"isRooted" : @(jailbroken),
    @"isEmulator" : @(emulator),
    @"isScreenRecording" : @(recording),
    @"isSecureScreenEnabled" : @(self.secureScreenEnabled),
    @"isPrivacyMode" : @(recording),
    @"isCompromised" : @(jailbroken || emulator),
    @"platform" : @"ios",
  };
}

#pragma mark - Jailbreak heuristics

- (BOOL)detectJailbreak {
  return [self hasJailbreakPaths] || [self canWriteOutsideSandbox] ||
         [self hasSuspiciousDylibs] || [self hasCydiaScheme];
}

- (BOOL)hasJailbreakPaths {
  NSArray<NSString *> *paths = @[
    @"/Applications/Cydia.app",
    @"/Applications/Sileo.app",
    @"/Applications/Zebra.app",
    @"/Applications/blackra1n.app",
    @"/Applications/FakeCarrier.app",
    @"/Applications/Icy.app",
    @"/Library/MobileSubstrate/MobileSubstrate.dylib",
    @"/private/var/lib/apt",
    @"/private/var/lib/cydia",
    @"/private/var/stash",
    @"/private/var/tmp/cydia.log",
    @"/System/Library/LaunchDaemons/com.ikey.bbot.plist",
    @"/System/Library/LaunchDaemons/com.saurik.Cydia.Startup.plist",
    @"/usr/bin/sshd",
    @"/usr/libexec/sftp-server",
    @"/usr/sbin/sshd",
    @"/etc/apt",
    @"/bin/bash",
    @"/usr/sbin/frida-server",
    @"/usr/bin/cycript",
    @"/usr/lib/libcycript.dylib",
    @"/var/jb",
  ];

  NSFileManager *fm = NSFileManager.defaultManager;
  for (NSString *path in paths) {
    if ([fm fileExistsAtPath:path]) {
      return YES;
    }

    struct stat fileStat;
    if (stat(path.UTF8String, &fileStat) == 0) {
      return YES;
    }
  }

  return NO;
}

- (BOOL)canWriteOutsideSandbox {
  NSString *path = @"/private/device_shield_jailbreak_probe.txt";
  NSError *error = nil;
  [@"device-shield" writeToFile:path
                    atomically:YES
                      encoding:NSUTF8StringEncoding
                         error:&error];
  if (error == nil) {
    [NSFileManager.defaultManager removeItemAtPath:path error:nil];
    return YES;
  }
  return NO;
}

- (BOOL)hasSuspiciousDylibs {
  NSArray<NSString *> *suspicious = @[
    @"MobileSubstrate", @"libcycript", @"SubstrateLoader", @"SubstrateInserter",
    @"frida", @"FridaGadget", @"cycript", @"cynject", @"SSLKillSwitch"
  ];

  uint32_t count = _dyld_image_count();
  for (uint32_t i = 0; i < count; i++) {
    const char *name = _dyld_get_image_name(i);
    if (name == NULL) {
      continue;
    }
    NSString *image = [NSString stringWithUTF8String:name].lowercaseString;
    for (NSString *token in suspicious) {
      if ([image containsString:token.lowercaseString]) {
        return YES;
      }
    }
  }
  return NO;
}

- (BOOL)hasCydiaScheme {
  NSURL *url = [NSURL URLWithString:@"cydia://package/com.example.package"];
  if (url == nil) {
    return NO;
  }
  return [UIApplication.sharedApplication canOpenURL:url];
}

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params {
  return std::make_shared<facebook::react::NativeDeviceShieldSpecJSI>(params);
}

+ (NSString *)moduleName {
  return @"DeviceShield";
}

@end
