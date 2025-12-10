# Netlify Sorun Giderme - 500 Hata Çözümü

## 🔴 Sorun: "Sunucu kimlik doğrulama hatası" (500 Error)

Bu hata, Netlify'da environment variables'ların eksik olmasından kaynaklanır.

## ✅ Hızlı Çözüm Adımları

### 1. Netlify Function Log'larını Kontrol Edin

**Netlify Dashboard** → Projeniz → **Functions** → Son deploy → **Function log**

Log'larda şuna benzer bir mesaj göreceksiniz:
```
[Signup] Missing environment variables: {
  hasServiceRoleKey: false,
  hasSupabaseUrl: true,
  missing: ['SUPABASE_SERVICE_ROLE_KEY']
}
```

### 2. Flutter Response'da `details` Alanını Kontrol Edin

Flutter uygulamanızda response'u şöyle kontrol edin:

```dart
final result = json.decode(response.body);
print('Error: ${result['error']}');
print('Details: ${result['details']}'); // Bu alanı kontrol edin!
print('Missing Variables: ${result['missingVariables']}');
```

Response'da `details` alanı hangi environment variable'ın eksik olduğunu gösterir.

### 3. Netlify'da Environment Variables Ekleyin

**Netlify Dashboard** → **Site settings** → **Build & deploy** → **Environment**

Aşağıdaki 3 variable'ı **mutlaka** ekleyin:

#### ✅ Gerekli Variables:

1. **NEXT_PUBLIC_SUPABASE_URL**
   ```
   Key: NEXT_PUBLIC_SUPABASE_URL
   Value: https://coslphxfuttaaharpovp.supabase.co
   Scope: Production, Deploy previews, Branch deploys (HEPSİNİ SEÇİN!)
   ```

2. **NEXT_PUBLIC_SUPABASE_ANON_KEY**
   ```
   Key: NEXT_PUBLIC_SUPABASE_ANON_KEY
   Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvc2xwaHhmdXR0YWFoYXJwb3ZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI2MDUzNTUsImV4cCI6MjA3ODE4MTM1NX0.QLw2FYW1yp5uridgyaDXS-old66Npcdij1a8XSuU7b0
   Scope: Production, Deploy previews, Branch deploys
   ```

3. **SUPABASE_SERVICE_ROLE_KEY** ⚠️ **EN ÖNEMLİ - BU EKSİK OLABİLİR**
   ```
   Key: SUPABASE_SERVICE_ROLE_KEY
   Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvc2xwaHhmdXR0YWFoYXJwb3ZwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjYwNTM1NSwiZXhwIjoyMDc4MTgxMzU1fQ.Jw3xDBF2Nij2RFDFPqgnOCBuy-LNE7hL6d2UH4uRtTo
   Scope: Production, Deploy previews, Branch deploys
   ```

### 4. ⚠️ ÖNEMLİ: Scope Kontrolü

Her variable için **3 scope'u da seçtiğinizden emin olun:**
- ✅ Production
- ✅ Deploy previews  
- ✅ Branch deploys

Eğer sadece Production'da tanımlıysa, diğer environment'larda çalışmaz!

### 5. Deploy'u Yeniden Başlatın

Environment variables ekledikten sonra **MUTLAKA** deploy'u yeniden başlatın:

1. **Deploys** sekmesi
2. **Trigger deploy** → **Deploy site**
3. Deploy'un tamamlanmasını bekleyin (2-5 dakika)

### 6. Test Edin

Flutter uygulamanızdan tekrar deneyin. Hata devam ederse:

1. Netlify function log'larını tekrar kontrol edin
2. Flutter'da `details` alanını yazdırın
3. Hangi variable'ın eksik olduğunu görün

## 🔍 Flutter'da Detaylı Hata Kontrolü

Flutter kodunuzu şöyle güncelleyin:

```dart
final response = await http.post(
  Uri.parse('https://stocktakingred.netlify.app/api/auth/signup'),
  headers: {'Content-Type': 'application/json'},
  body: json.encode({
    'email': email,
    'password': password,
    'companyName': companyName,
    'fullName': fullName,
  }),
);

final result = json.decode(response.body);

if (response.statusCode != 200) {
  print('❌ Hata: ${result['error']}');
  print('📋 Detaylar: ${result['details']}');
  print('🔑 Eksik Variables: ${result['missingVariables']}');
  print('✅ Service Role Key Var mı: ${result['hasServiceRoleKey']}');
  print('✅ Supabase URL Var mı: ${result['hasSupabaseUrl']}');
}
```

Bu çıktı size hangi variable'ın eksik olduğunu gösterecek.

## 📋 Kontrol Listesi

- [ ] Netlify Dashboard'a giriş yaptım
- [ ] Site settings → Environment variables'a gittim
- [ ] `NEXT_PUBLIC_SUPABASE_URL` ekledim (tüm scope'larda)
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` ekledim (tüm scope'larda)
- [ ] `SUPABASE_SERVICE_ROLE_KEY` ekledim (tüm scope'larda) ⚠️
- [ ] Her variable için 3 scope'u da seçtim
- [ ] Deploy'u yeniden başlattım
- [ ] Flutter'da `details` alanını kontrol ettim

## 🐛 Hala Çalışmıyorsa

1. **Netlify Function Log'larını** ekran görüntüsü alın
2. **Environment variables listesini** ekran görüntüsü alın
3. **Flutter response'u** (`details` alanı ile birlikte) paylaşın

Bu bilgilerle sorunu daha hızlı çözebiliriz.


