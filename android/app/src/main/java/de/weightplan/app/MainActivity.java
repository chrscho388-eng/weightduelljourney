package de.weightplan.app;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.ContentValues;
import android.content.Intent;
import android.content.SharedPreferences;
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

import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

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
    private static final String RELEASE_API = "https://api.github.com/repos/chrscho388-eng/weightduelljourney/releases/tags/latest";
    private static final String APK_URL = "https://github.com/chrscho388-eng/weightduelljourney/releases/download/latest/Weightplan.apk";
    private File pendingApk;

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
    protected void onResume() {
        super.onResume();
        if (pendingApk != null && Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && getPackageManager().canRequestPackageInstalls()) {
            File f = pendingApk;
            pendingApk = null;
            startInstall(f);
        }
    }

    /** Sends a result to the page: window.__wpUpdate(kind, value). */
    private void toPage(final String kind, final String value) {
        runOnUiThread(() -> webView.evaluateJavascript("window.__wpUpdate && window.__wpUpdate(" + JSONObject.quote(kind) + "," + JSONObject.quote(value) + ")", null));
    }

    private int ownBuild() {
        try {
            String v = getPackageManager().getPackageInfo(getPackageName(), 0).versionName;
            return Integer.parseInt(v.substring(v.indexOf('.') + 1));
        } catch (Exception e) {
            return 0;
        }
    }

    private static HttpURLConnection open(String url) throws Exception {
        HttpURLConnection c = (HttpURLConnection) new URL(url).openConnection();
        c.setRequestProperty("User-Agent", "Weightplan-App");
        c.setConnectTimeout(15000);
        c.setReadTimeout(30000);
        c.setInstanceFollowRedirects(true);
        return c;
    }

    private void startInstall(File apk) {
        try {
            Uri uri = androidx.core.content.FileProvider.getUriForFile(this, getPackageName() + ".files", apk);
            Intent i = new Intent(Intent.ACTION_VIEW);
            i.setDataAndType(uri, "application/vnd.android.package-archive");
            i.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
            startActivity(i);
            toPage("installing", "");
        } catch (Exception e) {
            toPage("error", "Installation konnte nicht gestartet werden.");
        }
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
        /** Version name of the installed app, e.g. "3.12". */
        @JavascriptInterface
        public String getVersion() {
            try {
                return getPackageManager().getPackageInfo(getPackageName(), 0).versionName;
            } catch (Exception e) {
                return "";
            }
        }

        /** Reminder settings from the page, e.g. {"weigh":{"on":true,"time":"07:00"},"steps":{"on":true,"time":"20:30"}}. */
        @JavascriptInterface
        public void setReminders(String json) {
            getSharedPreferences(ReminderReceiver.PREFS, MODE_PRIVATE).edit().putString("config", json).apply();
            ReminderReceiver.schedule(MainActivity.this);
            boolean any = json.contains("\"on\":true");
            if (any && Build.VERSION.SDK_INT >= 33 && checkSelfPermission("android.permission.POST_NOTIFICATIONS") != android.content.pm.PackageManager.PERMISSION_GRANTED) {
                runOnUiThread(() -> requestPermissions(new String[]{"android.permission.POST_NOTIFICATIONS"}, 7));
            }
        }

        /** Today's state from the page, so a reminder is skipped when the thing is already logged. */
        @JavascriptInterface
        public void dayState(String date, boolean weighed, boolean steps) {
            if (!date.equals(ReminderReceiver.today())) return;
            SharedPreferences.Editor e = getSharedPreferences(ReminderReceiver.PREFS, MODE_PRIVATE).edit();
            if (weighed) e.putString("weighed", date);
            if (steps) e.putString("steps", date);
            e.apply();
        }

        /** Looks up the newest release on GitHub; answers window.__wpUpdate("available"|"current"|"error", ...). */
        @JavascriptInterface
        public void checkUpdate() {
            new Thread(() -> {
                try {
                    HttpURLConnection c = open(RELEASE_API);
                    c.setRequestProperty("Accept", "application/vnd.github+json");
                    if (c.getResponseCode() != 200) { toPage("error", "GitHub antwortet nicht (" + c.getResponseCode() + ")."); return; }
                    ByteArrayOutputStream buf = new ByteArrayOutputStream();
                    try (InputStream in = c.getInputStream()) { byte[] b = new byte[8192]; int n; while ((n = in.read(b)) > 0) buf.write(b, 0, n); }
                    String name = new JSONObject(buf.toString("UTF-8")).optString("name", "");
                    Matcher m = Pattern.compile("Weightplan 3\\.(\\d+)").matcher(name);
                    if (!m.find()) { toPage("error", "Keine Version im Release gefunden."); return; }
                    int latest = Integer.parseInt(m.group(1));
                    toPage(latest > ownBuild() ? "available" : "current", "3." + latest);
                } catch (Exception e) {
                    toPage("error", "Keine Verbindung zu GitHub.");
                }
            }).start();
        }

        /** Downloads the newest APK and opens Android's installer (the user confirms there). */
        @JavascriptInterface
        public void installUpdate() {
            new Thread(() -> {
                try {
                    File dir = new File(getCacheDir(), "updates");
                    if (!dir.exists() && !dir.mkdirs()) { toPage("error", "Kein Speicherplatz für das Update."); return; }
                    File apk = new File(dir, "Weightplan.apk");
                    HttpURLConnection c = open(APK_URL);
                    if (c.getResponseCode() != 200) { toPage("error", "Download fehlgeschlagen (" + c.getResponseCode() + ")."); return; }
                    long total = c.getContentLengthLong(), done = 0; int last = -1;
                    try (InputStream in = c.getInputStream(); OutputStream out = new FileOutputStream(apk)) {
                        byte[] b = new byte[65536]; int n;
                        while ((n = in.read(b)) > 0) {
                            out.write(b, 0, n); done += n;
                            if (total > 0) { int pct = (int) (done * 100 / total); if (pct / 10 != last) { last = pct / 10; toPage("progress", String.valueOf(pct)); } }
                        }
                    }
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && !getPackageManager().canRequestPackageInstalls()) {
                        // first time: Android asks once to allow installs from this app, then we continue in onResume
                        pendingApk = apk;
                        toPage("permission", "");
                        runOnUiThread(() -> startActivity(new Intent(android.provider.Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:" + getPackageName()))));
                        return;
                    }
                    startInstall(apk);
                } catch (Exception e) {
                    toPage("error", "Download fehlgeschlagen. Prüfe die Internetverbindung.");
                }
            }).start();
        }

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
