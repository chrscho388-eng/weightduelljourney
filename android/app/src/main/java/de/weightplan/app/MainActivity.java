package de.weightplan.app;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.ContentValues;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.provider.MediaStore;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import androidx.webkit.WebViewAssetLoader;

import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;

/**
 * Runs the Weightplan web app bundled in assets/index.html inside a WebView.
 * The page runs in its standalone mode: data in localStorage, kcal estimates
 * through the user's own Anthropic API key. The bridge below covers what a
 * WebView does not do by itself: file picking (photos, backups) and saving
 * the backup file into Downloads.
 */
public class MainActivity extends Activity {

    private static final String START_URL = "https://appassets.androidplatform.net/assets/index.html";
    private static final int FILE_CHOOSER_REQUEST = 1;

    private WebView webView;
    private ValueCallback<Uri[]> pendingFileCallback;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        final WebViewAssetLoader assetLoader = new WebViewAssetLoader.Builder()
                .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this))
                .build();

        webView = new WebView(this);
        setContentView(webView);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(true);

        webView.addJavascriptInterface(new Bridge(), "WeightplanAndroid");

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                return assetLoader.shouldInterceptRequest(request.getUrl());
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri url = request.getUrl();
                if ("appassets.androidplatform.net".equals(url.getHost())) return false;
                // External links (e.g. console.anthropic.com) open in the browser.
                try {
                    startActivity(new Intent(Intent.ACTION_VIEW, url));
                } catch (ActivityNotFoundException ignored) {
                }
                return true;
            }
        });

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
                if (pendingFileCallback != null) pendingFileCallback.onReceiveValue(null);
                pendingFileCallback = callback;
                Intent pick = params.createIntent();
                Intent chooser = Intent.createChooser(pick, null);
                String[] types = params.getAcceptTypes();
                boolean wantsImage = types != null && types.length > 0 && types[0].startsWith("image");
                if (wantsImage) {
                    // Offer the camera next to the gallery for photo estimates.
                    Intent camera = new Intent(MediaStore.ACTION_IMAGE_CAPTURE);
                    Uri photoUri = newPhotoUri();
                    if (photoUri != null) {
                        lastPhotoUri = photoUri;
                        camera.putExtra(MediaStore.EXTRA_OUTPUT, photoUri);
                        camera.addFlags(Intent.FLAG_GRANT_WRITE_URI_PERMISSION);
                        chooser.putExtra(Intent.EXTRA_INITIAL_INTENTS, new Intent[]{camera});
                    }
                }
                try {
                    startActivityForResult(chooser, FILE_CHOOSER_REQUEST);
                } catch (ActivityNotFoundException e) {
                    pendingFileCallback = null;
                    return false;
                }
                return true;
            }
        });

        if (savedInstanceState != null) {
            webView.restoreState(savedInstanceState);
        } else {
            webView.loadUrl(START_URL);
        }
    }

    private Uri lastPhotoUri;

    private Uri newPhotoUri() {
        try {
            File dir = new File(getCacheDir(), "photos");
            if (!dir.exists() && !dir.mkdirs()) return null;
            File file = new File(dir, "meal-" + System.currentTimeMillis() + ".jpg");
            return androidx.core.content.FileProvider.getUriForFile(this, getPackageName() + ".files", file);
        } catch (Exception e) {
            return null;
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        if (requestCode != FILE_CHOOSER_REQUEST || pendingFileCallback == null) {
            super.onActivityResult(requestCode, resultCode, data);
            return;
        }
        Uri[] result = null;
        if (resultCode == RESULT_OK) {
            if (data != null && (data.getData() != null || data.getClipData() != null)) {
                result = WebChromeClient.FileChooserParams.parseResult(resultCode, data);
            } else if (lastPhotoUri != null) {
                result = new Uri[]{lastPhotoUri}; // photo taken with the camera
            }
        }
        pendingFileCallback.onReceiveValue(result);
        pendingFileCallback = null;
        lastPhotoUri = null;
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        super.onSaveInstanceState(outState);
        webView.saveState(outState);
    }

    @Override
    public void onBackPressed() {
        if (webView.canGoBack()) webView.goBack();
        else super.onBackPressed();
    }

    /** Called from the page as window.WeightplanAndroid. */
    private class Bridge {
        /** Saves a text file into Downloads and returns where it went, or "" on failure. */
        @JavascriptInterface
        public String saveFile(String name, String content) {
            byte[] bytes = content.getBytes(StandardCharsets.UTF_8);
            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    ContentValues values = new ContentValues();
                    values.put(MediaStore.Downloads.DISPLAY_NAME, name);
                    values.put(MediaStore.Downloads.MIME_TYPE, "application/json");
                    values.put(MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS);
                    Uri uri = getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values);
                    if (uri == null) return "";
                    try (OutputStream out = getContentResolver().openOutputStream(uri)) {
                        out.write(bytes);
                    }
                    return "Downloads/" + name;
                } else {
                    File dir = getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS);
                    if (dir == null) return "";
                    File file = new File(dir, name);
                    try (FileOutputStream out = new FileOutputStream(file)) {
                        out.write(bytes);
                    }
                    return file.getAbsolutePath();
                }
            } catch (Exception e) {
                return "";
            }
        }
    }
}
