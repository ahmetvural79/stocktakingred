run# Netlify Hata Ayıklama Rehberi

## 🔍 Sorun: "Sunucu kimlik doğrulama hatası" (500 Error)

Bu hata genellikle Netlify'da environment variables'ların eksik veya yanlış yapılandırılmış olmasından kaynaklanır.

## 📋 Adım 1: Netlify Function Log'larını Kontrol Edin

### Netlify Dashboard'dan Log Kontrolü:

1. **Netlify Dashboard** → Projenizi seçin
2. **Functions** sekmesine gidin
3. Son deploy'u seçin
4. **Function log** veya **Real-time logs** bölümünü açın
5. Kayıt işlemi yaparken log'ları izleyin

### Log'larda Arayacağınız Mesajlar:

```
[Signup] Missing environment variables: {
  hasServiceRoleKey: false,
  hasSupabaseUrl: true,
  missing: ['SUPABASE_SERVICE_ROLE_KEY']
}
```

Bu mesaj hangi environment variable'ın eksik olduğunu gösterir.

## 📋 Adım 2: Environment Variables'ları Kontrol Edin

### Netlify Dashboard'dan Kontrol:

1. **Site settings** → **Build & deploy** → **Environment**
2. Aşağıdaki variables'ların **hepsinin** ekli olduğundan emin olun:

#### ✅ Gerekli Environment Variables:

1. **NEXT_PUBLIC_SUPABASE_URL**
   - Key: `NEXT_PUBLIC_SUPABASE_URL`
   - Value: `https://coslphxfuttaaharpovp.supabase.co`
   - Scope: **Production, Deploy previews, Branch deploys** (hepsini seçin)

2. **NEXT_PUBLIC_SUPABASE_ANON_KEY**
   - Key: `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Value: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvc2xwaHhmdXR0YWFoYXJwb3ZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI2MDUzNTUsImV4cCI6MjA3ODE4MTM1NX0.QLw2FYW1yp5uridgyaDXS-old66Npcdij1a8XSuU7b0`
   - Scope: **Production, Deploy previews, Branch deploys**

3. **SUPABASE_SERVICE_ROLE_KEY** ⚠️ **EN ÖNEMLİ**
   - Key: `SUPABASE_SERVICE_ROLE_KEY`
   - Value: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvc2xwaHhmdXR0YWFoYXJwb3ZwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjYwNTM1NSwiZXhwIjoyMDc4MTgxMzU1fQ.Jw3xDBF2Nij2RFDFPqgnOCBuy-LNE7hL6d2UH4uRtTo`
   - Scope: **Production, Deploy previews, Branch deploys**

### ⚠️ Önemli Kontroller:

- [ ] Her variable'ın **tüm scope'larda** (Production, Deploy previews, Branch deploys) tanımlı olduğundan emin olun
- [ ] Key isimlerinin **tam olarak** doğru yazıldığından emin olun (büyük/küçük harf duyarlı)
- [ ] Value'ların **başında veya sonunda boşluk** olmadığından emin olun
- [ ] Value'ların **tam olarak** kopyalandığından emin olun

## 📋 Adım 3: Deploy'u Yeniden Başlatın

Environment variables ekledikten veya güncelledikten sonra:

1. **Deploys** sekmesine gidin
2. **Trigger deploy** → **Deploy site** butonuna tıklayın
3. Deploy'un tamamlanmasını bekleyin (2-5 dakika)

## 📋 Adım 4: Test Edin

1. Flutter uygulamanızdan kayıt işlemini tekrar deneyin
2. Hata devam ederse, Netlify function log'larını tekrar kontrol edin

## 🔧 Alternatif: Netlify CLI ile Kontrol

Eğer Netlify CLI kuruluysa:

```bash
# Netlify CLI'yi kurun (eğer yoksa)
npm install -g netlify-cli

# Netlify'a giriş yapın
netlify login

# Environment variables'ları listeleyin
netlify env:list

# Belirli bir variable'ı kontrol edin
netlify env:get SUPABASE_SERVICE_ROLE_KEY
```

## 🐛 Yaygın Hatalar ve Çözümleri

### Hata 1: "Missing environment variables: SUPABASE_SERVICE_ROLE_KEY"

**Çözüm:**
- Netlify Dashboard → Environment variables
- `SUPABASE_SERVICE_ROLE_KEY` variable'ını ekleyin
- Deploy'u yeniden başlatın

### Hata 2: "Invalid API key"

**Çözüm:**
- Supabase Dashboard → Settings → API
- Service role key'i tekrar kopyalayın
- Netlify'da variable'ı güncelleyin
- Deploy'u yeniden başlatın

### Hata 3: Variable var ama hala çalışmıyor

**Çözüm:**
- Variable'ın **tüm scope'larda** tanımlı olduğundan emin olun
- Variable'ın value'sunda **boşluk** olmadığından emin olun
- Deploy'u **yeniden başlatın** (sadece eklemek yeterli değil)

## 📞 Hala Çalışmıyorsa

1. **Netlify Function Log'larını** kontrol edin ve bize gönderin
2. **Environment variables listesini** ekran görüntüsü alın
3. **Supabase Dashboard** → Settings → API'den key'leri tekrar kontrol edin

## 🔒 Güvenlik Notu

`SUPABASE_SERVICE_ROLE_KEY` çok hassas bir key'dir:
- ✅ Netlify environment variables'da saklayın
- ✅ Server-side (API routes) kullanın
- ❌ Client-side kodda kullanmayın
- ❌ Git repository'ye commit etmeyin
- ❌ Public olarak paylaşmayın


