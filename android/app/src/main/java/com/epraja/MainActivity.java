package com.epraja;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.os.Build;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setupStatusBar();
        createNotificationChannel();
    }

    private void setupStatusBar() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            getWindow().setStatusBarContrastEnforced(false);
            getWindow().setNavigationBarContrastEnforced(false);
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            getWindow().setStatusBarColor(0xFF0D0D0D);
            getWindow().setNavigationBarColor(0xFF0D0D0D);
        }
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
