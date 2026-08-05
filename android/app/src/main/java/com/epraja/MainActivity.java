package com.epraja;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.os.Build;
import android.os.Bundle;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        createNotificationChannel();
        sendTestNotification();
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

    private void sendTestNotification() {
        try {
            NotificationCompat.Builder builder =
                new NotificationCompat.Builder(this, "marketplace_orders")
                    .setSmallIcon(R.mipmap.ic_launcher)
                    .setContentTitle("🔔 É Pra Já Marketplace")
                    .setContentText("Notificações ativadas na central do seu celular!")
                    .setPriority(NotificationCompat.PRIORITY_MAX)
                    .setAutoCancel(true);

            NotificationManagerCompat.from(this).notify(999, builder.build());
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
