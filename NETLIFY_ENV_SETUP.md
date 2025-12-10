# Netlify Environment Variables Kurulumu

## 🔴 Sorun

Uygulama Netlify'da deploy edildiğinde şu hatayı alıyorsunuz:
```
Sunucu kimlik doğrulama hatası. Lütfen yöneticiyle iletişime geçin.
```

Bu hata, Supabase environment variable'larının Netlify'da doğru ayarlanmamış olmasından kaynaklanır.

## ✅ Çözüm: Netlify'da Environment Variables Ayarlama

### 1. Netlify Dashboard'a Giriş
1. https://app.netlify.com adresine gidin
2. Projenizi seçin

### 2. Environment Variables Ekleme
1. **Site settings** → **Environment variables** bölümüne gidin
2. Aşağıdaki environment variable'ları ekleyin:

#### Gerekli Environment Variables:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 3. Supabase'den Key'leri Alma

1. **Supabase Dashboard** → https://supabase.com/dashboard
2. Projenizi seçin
3. **Settings** → **API** bölümüne gidin
4. Şu bilgileri kopyalayın:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** key → `SUPABASE_SERVICE_ROLE_KEY` ⚠️ **ÖNEMLİ: Bu key gizli tutulmalı!**

### 4. Netlify'da Variable Ekleme Adımları

1. Netlify Dashboard → Projeniz → **Site settings**
2. **Build & deploy** → **Environment** bölümüne gidin
3. **Add a variable** butonuna tıklayın
4. Her bir variable için:
   - **Key**: Variable adı (örn: `NEXT_PUBLIC_SUPABASE_URL`)
   - **Value**: Supabase'den kopyaladığınız değer
   - **Scopes**: Tüm scope'ları seçin (Production, Deploy previews, Branch deploys)
5. **Save** butonuna tıklayın

### 5. Deploy'u Yeniden Başlatma

Environment variable'ları ekledikten sonra:
1. **Deploys** sekmesine gidin
2. En son deploy'un yanındaki **...** menüsünden **Trigger deploy** → **Clear cache and deploy site** seçin
3. Veya yeni bir commit push edin

## 🔍 Kontrol Listesi

Environment variable'ları ekledikten sonra kontrol edin:

- [ ] `NEXT_PUBLIC_SUPABASE_URL` eklendi ve doğru URL içeriyor
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` eklendi ve doğru key içeriyor
- [ ] `SUPABASE_SERVICE_ROLE_KEY` eklendi ve doğru key içeriyor
- [ ] Tüm variable'lar **Production**, **Deploy previews**, ve **Branch deploys** scope'larında aktif
- [ ] Deploy yeniden başlatıldı

## 🧪 Test Etme

Deploy tamamlandıktan sonra:

1. Flutter uygulamanızdan signup işlemini deneyin
2. Netlify **Functions logs** bölümünden hata loglarını kontrol edin
3. Eğer hala hata alıyorsanız, logları kontrol edin:
   - Netlify Dashboard → **Functions** → **Logs**
   - Veya **Deploys** → En son deploy → **View build log**

## 📝 Önemli Notlar

1. **Service Role Key Güvenliği:**
   - `SUPABASE_SERVICE_ROLE_KEY` çok güçlü yetkilere sahiptir
   - Bu key'i asla client-side kodda kullanmayın
   - Sadece server-side API route'larında kullanılmalıdır
   - GitHub'a commit etmeyin (`.env` dosyası `.gitignore`'da olmalı)

2. **Variable İsimleri:**
   - `NEXT_PUBLIC_` prefix'i olan variable'lar client-side'da da kullanılabilir
   - `SUPABASE_SERVICE_ROLE_KEY` gibi prefix'siz variable'lar sadece server-side'da kullanılır

3. **Deploy Sonrası:**
   - Environment variable'ları değiştirdikten sonra mutlaka yeni bir deploy yapın
   - Cache temizlenmesi gerekebilir

## 🐛 Sorun Giderme

### Hala "Sunucu kimlik doğrulama hatası" alıyorsanız:

1. **Variable'ların doğru olduğundan emin olun:**
   - Supabase Dashboard'dan key'leri tekrar kopyalayın
   - Netlify'da variable değerlerini kontrol edin (boşluk, yeni satır karakteri olmamalı)

2. **Deploy loglarını kontrol edin:**
   - Netlify Dashboard → **Deploys** → En son deploy → **View build log**
   - Environment variable'ların yüklendiğini kontrol edin

3. **API route loglarını kontrol edin:**
   - Signup işlemi sırasında console.log çıktılarını kontrol edin
   - Netlify Functions logs'da detaylı hata mesajlarını görün

4. **Supabase Key'lerini doğrulayın:**
   - Supabase Dashboard → **Settings** → **API**
   - Key'lerin hala geçerli olduğundan emin olun
   - Eğer key'ler değiştirildiyse, Netlify'da da güncelleyin

## 📞 Destek

Eğer sorun devam ederse:
1. Netlify deploy loglarını kontrol edin
2. Supabase Dashboard'da API key'lerin geçerli olduğunu doğrulayın
3. Environment variable'ların tüm scope'larda aktif olduğunu kontrol edin
