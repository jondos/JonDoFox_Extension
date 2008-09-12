// General prefs
pref("extensions.jondofox.profile_version", "2.0.1");

// Proxy prefs
pref("extensions.jondofox.jondo.proxy_host", "127.0.0.1");
pref("extensions.jondofox.jondo.proxy_port", 4001);
//pref("extensions.jondofox.tor.proxy_host", "127.0.0.1");
//pref("extensions.jondofox.tor.proxy_port", 9005);

// Useragent prefs
pref("extensions.jondofox.appname_override", "Netscape");
pref("extensions.jondofox.appversion_override", "5.0 (Windows; en)");
pref("extensions.jondofox.buildID_override", "0");
pref("extensions.jondofox.oscpu_override", "Windows NT 5.1");
pref("extensions.jondofox.platform_override", "Win32");
pref("extensions.jondofox.productsub_override", "20070713");
pref("extensions.jondofox.useragent_override", "Mozilla/5.0 Gecko/20070713 Firefox/2.0.0.0");
pref("extensions.jondofox.useragent_vendor", "");
pref("extensions.jondofox.useragent_vendorSub", "");

// Location neutrality
pref("extensions.jondofox.accept_languages", "en");
pref("extensions.jondofox.accept_charsets", "utf-8,*");
pref("extensions.jondofox.default_charset", "utf-8");
pref("extensions.jondofox.accept_default", "*/*");

// FIXME: This pref is not set if the user already has modified it?
lockPref("browser.history_expire_days", 0);
//pref("extensions.jondofox.disable_history", true);
