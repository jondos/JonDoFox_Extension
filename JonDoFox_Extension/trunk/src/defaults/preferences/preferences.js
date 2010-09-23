// General prefs
pref("extensions.jondofox.last_version", "");
pref("extensions.jondofox.new_profile", true);

// Proxy state 
pref("extensions.jondofox.proxy.state", "jondo");
pref("extensions.jondofox.alwaysUseJonDo", false);

// Set the 'Referer' header to the current domain
pref("extensions.jondofox.set_referrer", true);

// Show different warnings in the beginning
pref("extensions.jondofox.update_warning", true);
pref("extensions.jondofox.preferences_warning", true);
pref("extensions.jondofox.proxy_warning", true);

// No proxy list
pref("extensions.jondofox.no_proxies_on", "localhost, 127.0.0.1");

// Custom proxy
pref("extensions.jondofox.custom.label", "");
pref("extensions.jondofox.custom.user_agent", "normal");
pref("extensions.jondofox.custom.http_host", "");
pref("extensions.jondofox.custom.http_port", 0);
pref("extensions.jondofox.custom.ssl_host", "");
pref("extensions.jondofox.custom.ssl_port", 0);
pref("extensions.jondofox.custom.ftp_host", "");
pref("extensions.jondofox.custom.ftp_port", 0);
pref("extensions.jondofox.custom.gopher_host", "");
pref("extensions.jondofox.custom.gopher_port", 0);
pref("extensions.jondofox.custom.socks_host", "");
pref("extensions.jondofox.custom.socks_port", 0);
pref("extensions.jondofox.custom.socks_version", 5);
pref("extensions.jondofox.custom.share_proxy_settings", false);
pref("extensions.jondofox.custom.empty_proxy", true);

// Custom proxy backups
pref("extensions.jondofox.custom.backup.ssl_host", "");
pref("extensions.jondofox.custom.backup.ssl_port", 0);
pref("extensions.jondofox.custom.backup.ftp_host", "");
pref("extensions.jondofox.custom.backup.ftp_port", 0);
pref("extensions.jondofox.custom.backup.gopher_host", "");
pref("extensions.jondofox.custom.backup.gopher_port", 0);
pref("extensions.jondofox.custom.backup.socks_host", "");
pref("extensions.jondofox.custom.backup.socks_port", 0);
pref("extensions.jondofox.custom.backup.socks_version", 5);

// Tor proxy settings
pref("extensions.jondofox.tor.http_host", "");
pref("extensions.jondofox.tor.http_port", 0);
pref("extensions.jondofox.tor.ssl_host", "");
pref("extensions.jondofox.tor.ssl_port", 0);

// Useragent
// JonDo settings
pref("extensions.jondofox.jondo.appname_override", "Netscape");
pref("extensions.jondofox.jondo.appversion_override", "5.0 (en-US)");
pref("extensions.jondofox.jondo.buildID_override", "0");
pref("extensions.jondofox.jondo.oscpu_override", "");
pref("extensions.jondofox.jondo.platform_override", "");
pref("extensions.jondofox.jondo.productsub_override", "20090729");
pref("extensions.jondofox.jondo.useragent_override", "Mozilla/5.0 (en-US; rv:1.9.1.2) Gecko/20090729 Firefox/3.5.2");
pref("extensions.jondofox.jondo.useragent_vendor", "");
pref("extensions.jondofox.jondo.useragent_vendorSub", "");

// Tor settings
pref("extensions.jondofox.tor.appname_override","Netscape");
pref("extensions.jondofox.tor.appversion_override","5.0 (Windows; en-US)");
pref("extensions.jondofox.tor.platform_override","Win32");
pref("extensions.jondofox.tor.oscpu_override", "Windows NT 6.1");
pref("extensions.jondofox.tor.useragent_override", "Mozilla/5.0 (Windows; U; Windows NT 6.1; en-US; rv:1.9.2.3) Gecko/20100401 Firefox/3.6.3");
pref("extensions.jondofox.tor.productsub_override","20100401");
pref("extensions.jondofox.tor.buildID_override","0");
pref("extensions.jondofox.tor.useragent_vendor", "");
pref("extensions.jondofox.tor.useragent_vendorSub","");

// Location neutrality
pref("extensions.jondofox.accept_languages", "en-us");
pref("extensions.jondofox.accept_charsets", "*");
pref("extensions.jondofox.default_charset", "");
pref("extensions.jondofox.accept_default", "text/html,application/xml,*/*");

// If the user sets a Torbutton UA then use the following values as well
pref("extensions.jondofox.tor.accept_languages", "en-us, en");
pref("extensions.jondofox.tor.accept_charsets", "iso-8859-1,*,utf-8");

// Feed prefs
pref("extensions.jondofox.feeds_handler_default", "bookmarks");
pref("extensions.jondofox.audioFeeds_handler_default", "bookmarks");
pref("extensions.jondofox.videoFeeds_handler_default", "bookmarks");

// External app warn prefs
pref("extensions.jondofox.network-protocol-handler.warn_external_news", true);
pref("extensions.jondofox.network-protocol-handler.warn_external_snews", true);
pref("extensions.jondofox.network-protocol-handler.warn_external_file", true);
pref("extensions.jondofox.network-protocol-handler.warn_external_nntp", true);
pref("extensions.jondofox.network-protocol-handler.warn_external_mailto", true);
pref("extensions.jondofox.network-protocol-handler.warn_external_default", true);

// Certificate prefs
pref("extensions.jondofox.security.default_personal_cert", "Ask Every Time");
pref("extensions.jondofox.security.remember_cert_checkbox_default_setting", false);

// Miscellaneous
// Just in case someone has enabled it...
pref("extensions.jondofox.browser_send_pings", false);
// Do not let them know the full plugin path...
pref("extensions.jondofox.plugin.expose_full_path", false);
// Do not track users via their site specific zoom [sic!]
pref("extensions.jondofox.browser.zoom.siteSpecific", false);
// UA locale spoofing
pref("extensions.jondofox.useragent_locale", "en-US");
pref("extensions.jondofox.source_editor_external", false);
pref("extensions.jondofox.dom_storage_enabled", false);
pref("extensions.jondofox.geo_enabled", false);
pref("extensions.jondofox.network_prefetch-next", false);
pref("extensions.jondofox.cookieBehavior", 2);
pref("extensions.jondofox.socks_remote_dns", true);
// Only valid for FF4
pref("extensions.jondofox.websocket.enabled", false);
// Only valid for FF3
pref("extensions.jondofox.history_expire_days", 0);
// places.history.enabled replaces browser.history_expire_days in FF4
pref("extensions.jondofox.history.enabled", false);
pref("extensions.jondofox.proxy_keep-alive", false);
pref("extensions.jondofox.noscript_contentBlocker", true);
pref("extensions.jondofox.noscript_showDomain", false);
//pref("extensions.jondofox.showAnontestNoProxy", true);
pref("extensions.jondofox.search_suggest_enabled", false);
pref("extensions.jondofox.delete_searchbar", true);

//SafeCache
pref("extensions.jondofox.stanford-safecache_enabled", true);

//Certificate Patrol
pref("extensions.jondofox.certpatrol_enabled", true);
pref("extensions.jondofox.certpatrol_showNewCert", false);
pref("extensions.jondofox.certpatrol_showChangedCert", false);
