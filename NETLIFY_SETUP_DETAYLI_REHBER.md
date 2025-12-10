# 📍 Netlify Environment Variables - Detaylı Konum Rehberi

## 🎯 AMAÇ
Bu rehber, Supabase key'lerini ve Netlify'da nereye ekleneceğini **tam konumlarıyla** gösterir.

---

## 📍 BÖLÜM 1: SUPABASE'DEN KEY'LERİ ALMA

### Adım 1: Supabase Dashboard'a Giriş

1. **Tarayıcınızda şu adresi açın:**
   ```
   https://supabase.com/dashboard
   ```

2. **Giriş yapın** (eğer giriş yapmadıysanız)

3. **Projenizi seçin** (liste görünürse)

### Adım 2: API Settings'e Gitme

**Yol:**
```
Supabase Dashboard (Ana Sayfa)
  └─ Sol menüden projenizi seçin
      └─ Sol menüden "Settings" (⚙️ ikonu) tıklayın
          └─ "API" sekmesine tıklayın
```

**Alternatif Yol:**
- Sol menüden direkt **"Settings"** → **"API"** tıklayın

### Adım 3: Key'leri Bulma ve Kopyalama

**API Settings sayfasında şunları göreceksiniz:**

```
┌─────────────────────────────────────────────────┐
│ Project URL                                     │
│ https://xxxxxxxxxxxxx.supabase.co              │
│ [📋 Copy]                                       │
├─────────────────────────────────────────────────┤
│ anon public                                     │
│ eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ...    │
│ [📋 Copy]                                       │
├─────────────────────────────────────────────────┤
│ service_role (secret)                           │
│ eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ...    │
│ [📋 Copy] ⚠️ SECRET - DO NOT SHARE             │
└─────────────────────────────────────────────────┘
```

**Yapmanız Gerekenler:**

1. **Project URL'i kopyalayın:**
   - "Project URL" bölümündeki URL'nin yanındaki **"Copy"** butonuna tıklayın
   - Veya URL'yi seçip Ctrl+C (Windows) / Cmd+C (Mac) ile kopyalayın
   - **Bu değer:** `NEXT_PUBLIC_SUPABASE_URL` olacak

2. **anon public key'i kopyalayın:**
   - "anon public" bölümündeki uzun key'in yanındaki **"Copy"** butonuna tıklayın
   - **Bu değer:** `NEXT_PUBLIC_SUPABASE_ANON_KEY` olacak

3. **service_role key'i kopyalayın:**
   - "service_role (secret)" bölümündeki uzun key'in yanındaki **"Copy"** butonuna tıklayın
   - ⚠️ **DİKKAT:** Bu key çok güçlü! Sadece Netlify'da kullanın, başka yerde paylaşmayın!
   - **Bu değer:** `SUPABASE_SERVICE_ROLE_KEY` olacak

---

## 📍 BÖLÜM 2: NETLIFY'DA ENVIRONMENT VARIABLES EKLEME

### Adım 1: Netlify Dashboard'a Giriş

1. **Tarayıcınızda şu adresi açın:**
   ```
   https://app.netlify.com
   ```

2. **Giriş yapın** (eğer giriş yapmadıysanız)

3. **Projenizi seçin:**
   - Ana sayfada projeleriniz listelenir
   - **"stocktakingred"** projesine tıklayın

### Adım 2: Site Settings'e Gitme

**Yol:**
```
Netlify Dashboard (Ana Sayfa)
  └─ Projenizi seçin (stocktakingred)
      └─ Üst menüden "Site settings" tıklayın
          └─ Sol menüden "Environment variables" tıklayın
```

**Alternatif Yol:**
```
Netlify Dashboard
  └─ Projenizi seçin
      └─ Sol menüden "Site configuration" → "Environment variables"
```

**Veya:**
```
Netlify Dashboard
  └─ Projenizi seçin
      └─ "Build & deploy" → "Environment" → "Environment variables"
```

### Adım 3: Environment Variables Sayfası

**Bu sayfada şunları göreceksiniz:**

```
┌─────────────────────────────────────────────────────────┐
│ Environment variables                                   │
│                                                         │
│ Manage environment variables for this site              │
│                                                         │
│ [Add a variable] butonu                                │
│                                                         │
│ (Eğer daha önce variable eklediyseniz, burada          │
│  listelenir)                                            │
└─────────────────────────────────────────────────────────┘
```

### Adım 4: İlk Variable'ı Ekleme (NEXT_PUBLIC_SUPABASE_URL)

1. **"Add a variable"** butonuna tıklayın

2. **Açılan formu doldurun:**

```
┌─────────────────────────────────────────────────────────┐
│ Add environment variable                                │
│                                                         │
│ Key:                                                    │
│ [NEXT_PUBLIC_SUPABASE_URL                    ]          │
│                                                         │
│ Value:                                                  │
│ [https://xxxxxxxxxxxxx.supabase.co          ]          │
│                                                         │
│ Scopes:                                                 │
│ ☑ Production                                            │
│ ☑ Deploy previews                                       │
│ ☑ Branch deploys                                        │
│                                                         │
│ [Cancel]  [Add variable]                                 │
└─────────────────────────────────────────────────────────┘
```

**Formu doldururken:**
- **Key:** `NEXT_PUBLIC_SUPABASE_URL` (tam olarak bu şekilde, büyük harflerle)
- **Value:** Supabase'den kopyaladığınız Project URL (örn: `https://xxxxx.supabase.co`)
- **Scopes:** Üçünü de seçin (Production, Deploy previews, Branch deploys)
- **"Add variable"** butonuna tıklayın

### Adım 5: İkinci Variable'ı Ekleme (NEXT_PUBLIC_SUPABASE_ANON_KEY)

1. Tekrar **"Add a variable"** butonuna tıklayın

2. **Formu doldurun:**
   - **Key:** `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **Value:** Supabase'den kopyaladığınız **anon public** key (uzun bir JWT token)
   - **Scopes:** Üçünü de seçin
   - **"Add variable"** butonuna tıklayın

### Adım 6: Üçüncü Variable'ı Ekleme (SUPABASE_SERVICE_ROLE_KEY)

1. Tekrar **"Add a variable"** butonuna tıklayın

2. **Formu doldurun:**
   - **Key:** `SUPABASE_SERVICE_ROLE_KEY`
   - **Value:** Supabase'den kopyaladığınız **service_role** key (uzun bir JWT token)
   - **Scopes:** Üçünü de seçin
   - **"Add variable"** butonuna tıklayın

### Adım 7: Kontrol

**Environment variables sayfasında artık şunları görmelisiniz:**

```
┌─────────────────────────────────────────────────────────┐
│ Environment variables                                   │
│                                                         │
│ NEXT_PUBLIC_SUPABASE_URL                                │
│ https://xxxxx.supabase.co                               │
│ Production, Deploy previews, Branch deploys            │
│ [Edit] [Delete]                                         │
│                                                         │
│ NEXT_PUBLIC_SUPABASE_ANON_KEY                           │
│ eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...                │
│ Production, Deploy previews, Branch deploys            │
│ [Edit] [Delete]                                         │
│                                                         │
│ SUPABASE_SERVICE_ROLE_KEY                               │
│ eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...                │
│ Production, Deploy previews, Branch deploys            │
│ [Edit] [Delete]                                         │
│                                                         │
│ [Add a variable]                                        │
└─────────────────────────────────────────────────────────┘
```

---

## 📍 BÖLÜM 3: DEPLOY'U YENİDEN BAŞLATMA

### Adım 1: Deploys Sayfasına Gitme

**Yol:**
```
Netlify Dashboard
  └─ Projenizi seçin
      └─ Üst menüden "Deploys" sekmesine tıklayın
```

### Adım 2: Deploy'u Yeniden Başlatma

**Deploys sayfasında:**

1. **En üstteki (en son) deploy'u bulun**

2. **Deploy'un sağ tarafındaki "..." (üç nokta) menüsüne tıklayın**

3. **Açılan menüden:**
   ```
   Trigger deploy
     └─ Clear cache and deploy site
   ```
   seçeneğini tıklayın

**Alternatif:**
- Deploy'un yanındaki **"..."** menüsünden direkt **"Clear cache and deploy site"** seçeneğini görebilirsiniz

### Adım 3: Deploy'un Tamamlanmasını Bekleme

- Deploy işlemi 2-5 dakika sürebilir
- Sayfanın üst kısmında deploy durumunu görebilirsiniz
- "Published" yazısını görünce deploy tamamlanmış demektir

---

## 📍 BÖLÜM 4: KONTROL ETME

### Diagnostic Endpoint'i Kontrol Etme

1. **Tarayıcınızda şu URL'yi açın:**
   ```
   https://stocktakingred.netlify.app/api/health/env-check
   ```

2. **Beklenen sonuç:**
   ```json
   {
     "status": "ok",
     "message": "Tüm environment variable'lar doğru yapılandırılmış",
     "checks": {
       "NEXT_PUBLIC_SUPABASE_URL": {
         "exists": true,
         "length": 45,
         "startsWithHttps": true,
         "preview": "https://xxxxx.supabase.co..."
       },
       "NEXT_PUBLIC_SUPABASE_ANON_KEY": {
         "exists": true,
         "length": 200,
         "startsWithEyJ": true,
         "preview": "eyJhbGciOiJIUzI1NiIsInR5cCI..."
       },
       "SUPABASE_SERVICE_ROLE_KEY": {
         "exists": true,
         "length": 200,
         "startsWithEyJ": true,
         "preview": "eyJhbGciOiJIUzI1NiIsInR5cCI..."
       }
     },
     "timestamp": "2024-01-01T12:00:00.000Z"
   }
   ```

3. **Eğer "error" görüyorsanız:**
   - `"exists": false` olan variable'ları kontrol edin
   - Netlify'da variable'ların doğru eklendiğinden emin olun
   - Deploy'un tamamlandığından emin olun

---

## 🎯 HIZLI REFERANS

### Supabase Key'lerinin Konumu:
```
https://supabase.com/dashboard
  → Projeniz
    → Settings (⚙️)
      → API
        → Project URL (kopyala)
        → anon public (kopyala)
        → service_role (kopyala)
```

### Netlify Variable Ekleme Konumu:
```
https://app.netlify.com
  → Projeniz (stocktakingred)
    → Site settings
      → Environment variables
        → Add a variable
```

### Deploy Yeniden Başlatma:
```
https://app.netlify.com
  → Projeniz
    → Deploys
      → En son deploy'un "..." menüsü
        → Clear cache and deploy site
```

### Kontrol Endpoint'i:
```
https://stocktakingred.netlify.app/api/health/env-check
```

---

## ⚠️ ÖNEMLİ HATIRLATMALAR

1. **Variable İsimleri:**
   - Tam olarak yazın: `NEXT_PUBLIC_SUPABASE_URL` (büyük harflerle)
   - Boşluk veya yanlış yazım olmamalı

2. **Value'lar:**
   - Başında/sonunda boşluk olmamalı
   - Tırnak işareti kullanmayın
   - Tam key'i kopyalayın (çok uzun olabilir, normal)

3. **Scopes:**
   - Mutlaka üçünü de seçin
   - Aksi halde bazı durumlarda çalışmayabilir

4. **Deploy:**
   - Variable'ları ekledikten sonra MUTLAKA deploy yapın
   - "Clear cache and deploy site" seçeneğini kullanın

---

## 🆘 YARDIM

Eğer hala sorun yaşıyorsanız:

1. **Diagnostic endpoint sonucunu kontrol edin:**
   - https://stocktakingred.netlify.app/api/health/env-check
   - Hangi variable'ın eksik olduğunu göreceksiniz

2. **Netlify Environment Variables sayfasının ekran görüntüsünü alın:**
   - Variable isimlerini gösterin (value'ları gizleyin)
   - Kaç tane variable olduğunu kontrol edin

3. **Supabase API Settings sayfasını kontrol edin:**
   - Key'lerin hala geçerli olduğundan emin olun
   - Key'leri tekrar kopyalayıp Netlify'a yapıştırın


