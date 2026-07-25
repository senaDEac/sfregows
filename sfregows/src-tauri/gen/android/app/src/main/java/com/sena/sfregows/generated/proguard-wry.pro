# THIS FILE IS AUTO-GENERATED. DO NOT MODIFY!!

# Copyright 2020-2023 Tauri Programme within The Commons Conservancy
# SPDX-License-Identifier: Apache-2.0
# SPDX-License-Identifier: MIT

-keep class com.sena.sfregows.* {
  native <methods>;
}

-keep class com.sena.sfregows.WryActivity {
  public <init>(...);

  void setWebView(com.sena.sfregows.RustWebView);
  java.lang.Class getAppClass(...);
  int getId();
  java.lang.String getVersion();
  int startActivity(...);
}

-keep class com.sena.sfregows.Ipc {
  public <init>(...);

  @android.webkit.JavascriptInterface public <methods>;
}

-keep class com.sena.sfregows.RustWebView {
  public <init>(...);

  void loadUrlMainThread(...);
  void loadHTMLMainThread(...);
  void evalScript(...);
}

-keep class com.sena.sfregows.RustWebChromeClient,com.sena.sfregows.RustWebViewClient {
  public <init>(...);
}
