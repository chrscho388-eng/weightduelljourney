package de.weightplan.app;

import android.app.Activity;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;

import androidx.browser.customtabs.CustomTabColorSchemeParams;
import androidx.browser.customtabs.CustomTabsIntent;

/**
 * Opens the Weightplan artifact on claude.ai in a Chrome Custom Tab, so the
 * user's existing Chrome sign-in to claude.ai is reused and the app keeps its
 * data, Claude-based estimation and weekly reviews.
 */
public class MainActivity extends Activity {

    private static final String APP_URL = "https://claude.ai/artifact/ASMW4wKwuuup6b16ptVRnH";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        Uri uri = Uri.parse(APP_URL);
        try {
            CustomTabColorSchemeParams colors = new CustomTabColorSchemeParams.Builder()
                    .setToolbarColor(Color.parseColor("#2E6A4E"))
                    .build();
            CustomTabsIntent tab = new CustomTabsIntent.Builder()
                    .setDefaultColorSchemeParams(colors)
                    .setShowTitle(false)
                    .setUrlBarHidingEnabled(true)
                    .build();
            tab.launchUrl(this, uri);
        } catch (Exception e) {
            // No browser with Custom Tabs support: fall back to any browser.
            startActivity(new Intent(Intent.ACTION_VIEW, uri));
        }
        finish();
    }
}
