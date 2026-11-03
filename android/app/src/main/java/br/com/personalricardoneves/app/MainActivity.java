package br.com.personalricardoneves.app;

import android.graphics.Color;
import android.os.Bundle;
import android.view.View;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private static final int BACKGROUND = Color.parseColor("#121614");

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // Fundo escuro atrás da barra de status/navegação (evita a faixa branca)
        getWindow().getDecorView().setBackgroundColor(BACKGROUND);
        View webView = getBridge() != null ? getBridge().getWebView() : null;
        if (webView != null) {
            webView.setBackgroundColor(BACKGROUND);
            if (webView.getParent() instanceof View) {
                ((View) webView.getParent()).setBackgroundColor(BACKGROUND);
            }
        }
        // Ícones claros (relógio, bateria) sobre o fundo escuro
        WindowInsetsControllerCompat controller =
            WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
        controller.setAppearanceLightStatusBars(false);
        controller.setAppearanceLightNavigationBars(false);
    }
}
