package com.emotionpharmacy.game;

import android.app.Activity;
import android.content.res.Configuration;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.webkit.MimeTypeMap;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.HashMap;
import java.util.Map;

/**
 * 情绪药店 Android 外壳。
 *
 * 把游戏放在 assets/www，通过虚拟 https 域名 appassets.local 提供，
 * 这样 WebView 会使用正常的 https 安全源，localStorage 可以持久保存，
 * 同时不需要网络权限，也不会把游戏暴露成 file:// 页面。
 */
public class MainActivity extends Activity {

    private static final String HOST = "appassets.local";
    private static final String START_URL = "https://" + HOST + "/index.html";
    private static final Map<String, String> MIME = new HashMap<>();

    static {
        MIME.put("html", "text/html");
        MIME.put("css", "text/css");
        MIME.put("js", "text/javascript");
        MIME.put("json", "application/json");
        MIME.put("svg", "image/svg+xml");
        MIME.put("png", "image/png");
        MIME.put("jpg", "image/jpeg");
        MIME.put("jpeg", "image/jpeg");
        MIME.put("webp", "image/webp");
        MIME.put("ico", "image/x-icon");
        MIME.put("woff", "font/woff");
        MIME.put("woff2", "font/woff2");
    }

    private WebView webView;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            getWindow().setStatusBarColor(Color.parseColor("#fef9ef"));
            getWindow().setNavigationBarColor(Color.parseColor("#fef9ef"));
        }
        int flags = View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            flags |= View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;
        }
        getWindow().getDecorView().setSystemUiVisibility(flags);

        webView = new WebView(this);
        webView.setBackgroundColor(Color.parseColor("#fef9ef"));
        webView.setOverScrollMode(View.OVER_SCROLL_NEVER);
        webView.setVerticalScrollBarEnabled(false);
        webView.setHorizontalScrollBarEnabled(false);
        webView.setLongClickable(false);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setLoadWithOverviewMode(true);
        settings.setUseWideViewPort(true);
        settings.setSupportZoom(false);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        settings.setTextZoom(100);
        settings.setMediaPlaybackRequiresUserGesture(true);
        settings.setJavaScriptCanOpenWindowsAutomatically(false);
        settings.setSupportMultipleWindows(false);
        settings.setGeolocationEnabled(false);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            settings.setForceDark(WebSettings.FORCE_DARK_OFF);
        }

        webView.setWebViewClient(new AssetClient());
        setContentView(webView);

        // 单页游戏：页面始终从 index.html 开始，进度由页面自己的 localStorage 恢复。
        webView.loadUrl(START_URL);
    }

    private final class AssetClient extends WebViewClient {
        @Override
        public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
            Uri uri = request.getUrl();
            if (uri == null || !HOST.equals(uri.getHost())) {
                return null;
            }
            String path = uri.getPath();
            if (path == null || path.isEmpty() || "/".equals(path)) {
                path = "/index.html";
            }
            if (path.contains("..")) {
                return null;
            }
            String assetPath = "www" + path;
            try {
                InputStream stream = getAssets().open(assetPath);
                String extension = MimeTypeMap.getFileExtensionFromUrl(path);
                String mime = MIME.get(extension);
                if (mime == null) {
                    mime = MimeTypeMap.getSingleton().getMimeTypeFromExtension(extension);
                }
                if (mime == null) {
                    mime = "application/octet-stream";
                }
                Map<String, String> headers = new HashMap<>();
                headers.put("Cache-Control", "no-cache");
                return new WebResourceResponse(mime, "UTF-8", 200, "OK", headers, stream);
            } catch (IOException e) {
                return new WebResourceResponse(
                        "text/plain",
                        "UTF-8",
                        404,
                        "Not Found",
                        new HashMap<String, String>(),
                        new ByteArrayInputStream("Not found".getBytes())
                );
            }
        }
    }

    @Override
    protected void onPause() {
        if (webView != null) {
            webView.onPause();
        }
        super.onPause();
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (webView != null) {
            webView.onResume();
        }
    }

    @SuppressWarnings("deprecation")
    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }

    @Override
    protected void onDestroy() {
        if (webView != null) {
            webView.stopLoading();
            webView.loadUrl("about:blank");
            webView.destroy();
            webView = null;
        }
        super.onDestroy();
    }
}
