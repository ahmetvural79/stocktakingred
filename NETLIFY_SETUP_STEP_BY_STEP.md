# 🚀 Netlify Environment Variables - Adım Adım Kurulum

## ⚠️ SORUN
Loglarınızda şu görünüyor:
```
📊 Environment Variables Durumu:
   • SUPABASE_SERVICE_ROLE_KEY: ❌ Eksik
   • NEXT_PUBLIC_SUPABASE_URL: ❌ Eksik
   • NEXT_PUBLIC_SUPABASE_ANON_KEY: ❌ Eksik
```

## ✅ ÇÖZÜM - ADIM ADIM

### ADIM 1: Supabase'den Key'leri Alın

1. **Supabase Dashboard'a gidin:**
   - https://supabase.com/dashboard
   - Projenizi seçin

2. **Settings → API** bölümüne gidin

3. **3 adet bilgiyi kopyalayın:**
   - **Project URL** (örn: `https://xxxxx.supabase.co`)
   - **anon public** key (uzun bir JWT token, `eyJ` ile başlar)
   - **service_role** key (uzun bir JWT token, `eyJ` ile başlar) ⚠️ **ÇOK ÖNEMLİ: Bu key gizli!**

### ADIM 2: Netlify Dashboard'a Gidin

1. **Netlify Dashboard:**
   - https://app.netlify.com
   - Projenizi seçin (stocktakingred)

### ADIM 3: Environment Variables Ekleme

1. **Sol menüden "Site settings"** tıklayın

2. **"Environment variables"** bölümüne gidin
   - Veya direkt: **Build & deploy** → **Environment**

3. **"Add a variable"** butonuna tıklayın

4. **İlk Variable'ı ekleyin:**
   - **Key:** `NEXT_PUBLIC_SUPABASE_URL`
   - **Value:** Supabase'den kopyaladığınız Project URL (örn: `https://xxxxx.supabase.co`)
   - **Scopes:** Tümünü seçin:
     - ✅ Production
     - ✅ Deploy previews  
     - ✅ Branch deploys
   - **"Add variable"** butonuna tıklayın

5. **İkinci Variable'ı ekleyin:**
   - **Key:** `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **Value:** Supabase'den kopyaladığınız **anon public** key
   - **Scopes:** Tümünü seçin
   - **"Add variable"** butonuna tıklayın

6. **Üçüncü Variable'ı ekleyin:**
   - **Key:** `SUPABASE_SERVICE_ROLE_KEY`
   - **Value:** Supabase'den kopyaladığınız **service_role** key
   - **Scopes:** Tümünü seçin
   - **"Add variable"** butonuna tıklayın

### ADIM 4: Deploy'u Yeniden Başlatın

1. **"Deploys"** sekmesine gidin (üst menüden)

2. En son deploy'un yanındaki **"..."** (üç nokta) menüsüne tıklayın

3. **"Trigger deploy"** → **"Clear cache and deploy site"** seçin

4. Deploy'un tamamlanmasını bekleyin (2-5 dakika)

### ADIM 5: Kontrol Edin

1. **Tarayıcıda şu URL'yi açın:**
   ```
   https://stocktakingred.netlify.app/api/health/env-check
   ```

2. **Beklenen sonuç:**
   ```json
   {
     "status": "ok",
     "message": "Tüm environment variable'lar doğru yapılandırılmış",
     "checks": {
       "NEXT_PUBLIC_SUPABASE_URL": { "exists": true, ... },
       "NEXT_PUBLIC_SUPABASE_ANON_KEY": { "exists": true, ... },
       "SUPABASE_SERVICE_ROLE_KEY": { "exists": true, ... }
     }
   }
   ```

3. **Eğer hala "error" görüyorsanız:**
   - Variable'ların doğru yazıldığından emin olun
   - Boşluk veya yeni satır karakteri olmamalı
   - Deploy'un tamamlandığından emin olun

### ADIM 6: Flutter Uygulamasını Test Edin

1. Flutter uygulamanızda signup işlemini tekrar deneyin
2. Artık başarılı olmalı! ✅

## 🔍 Görsel Rehber (Netlify UI)

### Environment Variables Sayfası:
```
Netlify Dashboard
  └─ Site settings
      └─ Environment variables
          └─ [Add a variable] butonu
```

### Variable Ekleme Formu:
```
Key: [NEXT_PUBLIC_SUPABASE_URL        ]
Value: [https://xxxxx.supabase.co     ]
Scopes:
  ☑ Production
  ☑ Deploy previews
  ☑ Branch deploys
[Add variable]
```

## ⚠️ ÖNEMLİ NOTLAR

1. **Variable İsimleri Tam Olmalı:**
   - `NEXT_PUBLIC_SUPABASE_URL` (büyük/küçük harf duyarlı)
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` (büyük/küçük harf duyarlı)
   - `SUPABASE_SERVICE_ROLE_KEY` (büyük/küçük harf duyarlı)

2. **Value'larda Boşluk Olmamalı:**
   - Key'leri kopyalarken başında/sonunda boşluk olmamalı
   - Tırnak işareti kullanmayın (sadece değeri yapıştırın)

3. **Tüm Scope'ları Seçin:**
   - Production, Deploy previews, Branch deploys hepsini seçin
   - Aksi halde bazı deploy'larda çalışmayabilir

4. **Deploy Gerekli:**
   - Variable'ları ekledikten sonra MUTLAKA deploy yapın
   - "Clear cache and deploy site" seçeneğini kullanın

## 🐛 SORUN GİDERME

### Hala "Eksik" görüyorsanız:

1. **Variable'ları kontrol edin:**
   - Netlify Dashboard → Site settings → Environment variables
   - 3 variable'ın da listede olduğundan emin olun

2. **Deploy loglarını kontrol edin:**
   - Deploys → En son deploy → View build log
   - Environment variable'ların yüklendiğini görmelisiniz

3. **Diagnostic endpoint'i kontrol edin:**
   - https://stocktakingred.netlify.app/api/health/env-check
   - Hangi variable'ın eksik olduğunu göreceksiniz

4. **Supabase key'lerini tekrar kontrol edin:**
   - Supabase Dashboard → Settings → API
   - Key'lerin hala geçerli olduğundan emin olun

## 📞 YARDIM

Eğer hala sorun yaşıyorsanız:
1. Diagnostic endpoint sonucunu kontrol edin
2. Netlify deploy loglarını paylaşın
3. Environment variables ekranının ekran görüntüsünü alın (key isimlerini gizleyerek)


