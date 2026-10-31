package de.weightplan.app;

import android.app.AlarmManager;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;

import org.json.JSONObject;

import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.Locale;

/**
 * Local reminders without any server: "weigh" on Tuesday mornings and "steps" in the evening.
 * The page sends the settings (setReminders) and today's state (dayState) through the bridge;
 * a reminder only shows when the thing is still missing for today.
 */
public class ReminderReceiver extends BroadcastReceiver {
    static final String PREFS = "reminders";
    static final String ACTION = "de.weightplan.app.REMIND";
    private static final String CHANNEL = "reminders";

    @Override
    public void onReceive(Context ctx, Intent intent) {
        String action = intent.getAction();
        if (ACTION.equals(action)) {
            String kind = intent.getStringExtra("kind");
            if (kind != null) maybeNotify(ctx, kind);
        }
        schedule(ctx); // after a reminder, a reboot or an app update: plan the next ones
    }

    static String today() {
        return new SimpleDateFormat("yyyy-MM-dd", Locale.ROOT).format(Calendar.getInstance().getTime());
    }

    private static JSONObject config(Context ctx) {
        try {
            return new JSONObject(ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString("config", "{}"));
        } catch (Exception e) {
            return new JSONObject();
        }
    }

    private static PendingIntent alarmIntent(Context ctx, String kind, int code) {
        Intent i = new Intent(ctx, ReminderReceiver.class).setAction(ACTION).putExtra("kind", kind);
        return PendingIntent.getBroadcast(ctx, code, i, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    static void schedule(Context ctx) {
        AlarmManager am = (AlarmManager) ctx.getSystemService(Context.ALARM_SERVICE);
        if (am == null) return;
        JSONObject cfg = config(ctx);
        String[] kinds = {"weigh", "steps"};
        for (int n = 0; n < kinds.length; n++) {
            String kind = kinds[n];
            PendingIntent pi = alarmIntent(ctx, kind, 10 + n);
            am.cancel(pi);
            JSONObject c = cfg.optJSONObject(kind);
            if (c == null || !c.optBoolean("on", false)) continue;
            String[] hm = c.optString("time", "weigh".equals(kind) ? "07:00" : "20:30").split(":");
            Calendar at = Calendar.getInstance();
            at.set(Calendar.HOUR_OF_DAY, Integer.parseInt(hm[0]));
            at.set(Calendar.MINUTE, Integer.parseInt(hm[1]));
            at.set(Calendar.SECOND, 0);
            at.set(Calendar.MILLISECOND, 0);
            if (at.getTimeInMillis() <= System.currentTimeMillis() + 1000) at.add(Calendar.DAY_OF_YEAR, 1);
            if ("weigh".equals(kind)) while (at.get(Calendar.DAY_OF_WEEK) != Calendar.TUESDAY) at.add(Calendar.DAY_OF_YEAR, 1);
            am.setWindow(AlarmManager.RTC_WAKEUP, at.getTimeInMillis(), 10 * 60 * 1000, pi);
        }
    }

    private static void maybeNotify(Context ctx, String kind) {
        SharedPreferences p = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        String t = today();
        String title, text;
        if ("weigh".equals(kind)) {
            if (Calendar.getInstance().get(Calendar.DAY_OF_WEEK) != Calendar.TUESDAY || t.equals(p.getString("weighed", ""))) return;
            title = "Wiegetag";
            text = "Heute ist Dienstag: einmal nüchtern wiegen und eintragen.";
        } else {
            if (t.equals(p.getString("steps", ""))) return;
            title = "Schritte eintragen";
            text = "Für heute sind noch keine Schritte eingetragen.";
        }
        NotificationManager nm = (NotificationManager) ctx.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm == null) return;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            nm.createNotificationChannel(new NotificationChannel(CHANNEL, "Erinnerungen", NotificationManager.IMPORTANCE_DEFAULT));
        }
        Intent open = new Intent(ctx, MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent content = PendingIntent.getActivity(ctx, 0, open, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        Notification.Builder b = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O ? new Notification.Builder(ctx, CHANNEL) : new Notification.Builder(ctx);
        b.setSmallIcon(android.R.drawable.ic_popup_reminder).setContentTitle(title).setContentText(text).setContentIntent(content).setAutoCancel(true);
        try {
            nm.notify("weigh".equals(kind) ? 1 : 2, b.build());
        } catch (SecurityException ignored) {
            // notifications not allowed
        }
    }
}
