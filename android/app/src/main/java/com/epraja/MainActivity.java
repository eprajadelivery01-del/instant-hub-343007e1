package com.epraja;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.WindowManager;
import androidx.core.view.WindowCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setupStatusBar();
        createNotificationChannel();
    }

    @Override
    public void onResume() {
        super.onResume();
        setupStatusBar();
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) {
            setupStatusBar();
        }
    }

    private void setupStatusBar() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            getWindow().addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);
            getWindow().clearFlags(WindowManager.LayoutParams.FLAG_TRANSLUCENT_STATUS);
            getWindow().clearFlags(WindowManager.LayoutParams.FLAG_TRANSLUCENT_NAVIGATION);
            getWindow().setStatusBarColor(0xFF0D0D0D);
            getWindow().setNavigationBarColor(0xFF0D0D0D);
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            getWindow().setStatusBarContrastEnforced(false);
            getWindow().setNavigationBarContrastEnforced(false);
        }
        androidx.core.view.WindowInsetsControllerCompat insetsController = 
            WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
        if (insetsController != null) {
            insetsController.setAppearanceLightStatusBars(false); // false = dark bar, light icons
            insetsController.setAppearanceLightNavigationBars(false);
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            View decorView = getWindow().getDecorView();
            int flags = decorView.getSystemUiVisibility();
            flags &= ~View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                flags &= ~View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;
            }
            decorView.setSystemUiVisibility(flags);
        }
        WindowCompat.setDecorFitsSystemWindows(getWindow(), true);
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) {
                // Canal marketplace_orders
                NotificationChannel channel = new NotificationChannel(
                    "marketplace_orders",
                    "Atualizações de Pedidos",
                    NotificationManager.IMPORTANCE_HIGH
                );
                channel.setDescription("Notificações em tempo real do Marketplace");
                channel.enableVibration(true);
                channel.setShowBadge(true);
                manager.createNotificationChannel(channel);

                // Canal default
                NotificationChannel defaultChannel = new NotificationChannel(
                    "default",
                    "Notificações Gerais",
                    NotificationManager.IMPORTANCE_HIGH
                );
                defaultChannel.setDescription("Avisos e comunicados gerais do Marketplace");
                defaultChannel.enableVibration(true);
                defaultChannel.setShowBadge(true);
                manager.createNotificationChannel(defaultChannel);
            }
        }
    }
}
