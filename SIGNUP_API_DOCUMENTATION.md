# Firma Kayıt API Endpoint Dokümantasyonu

## 📍 Endpoint Bilgileri

**URL:** `POST /api/auth/signup`

**Base URL:**
- Production: `https://stocktakingred.netlify.app`
- Local: `http://localhost:3000` veya `http://192.168.1.37:3000`

**Tam URL:** `https://stocktakingred.netlify.app/api/auth/signup`

---

## 📤 Request (İstek)

### HTTP Method
```
POST
```

### Headers
```json
{
  "Content-Type": "application/json"
}
```

### Request Body (JSON)

```json
{
  "email": "string",
  "password": "string",
  "companyName": "string",
  "fullName": "string"
}
```

### Parametreler Detayı

| Parametre | Tip | Zorunlu | Açıklama | Örnek |
|-----------|-----|---------|----------|-------|
| `email` | string | ✅ Evet | Kullanıcının email adresi. Otomatik olarak lowercase'e çevrilir ve trim edilir. | `"user@example.com"` |
| `password` | string | ✅ Evet | Kullanıcının şifresi. Minimum 6 karakter olmalıdır. | `"password123"` |
| `companyName` | string | ✅ Evet | Firma adı. Otomatik olarak trim edilir. | `"ABC Ltd. Şti."` |
| `fullName` | string | ✅ Evet | Kullanıcının ad soyad bilgisi. Otomatik olarak trim edilir. | `"Ahmet Yılmaz"` |

---

## 📥 Response (Yanıt)

### Başarılı Yanıt (200 OK)

```json
{
  "success": true,
  "message": "Firma kaydı ve kullanıcı oluşturuldu."
}
```

### Hata Yanıtları

#### 400 Bad Request - Eksik Parametre

```json
{
  "error": "Email, şifre, firma adı ve ad soyad gereklidir."
}
```

#### 400 Bad Request - Şifre Uzunluğu

```json
{
  "error": "Şifre en az 6 karakter olmalıdır."
}
```

#### 409 Conflict - Email Zaten Kayıtlı

```json
{
  "error": "Bu email adresiyle daha önce kayıt yapılmış."
}
```

#### 500 Internal Server Error - Environment Variables Eksik

```json
{
  "error": "Sunucu yapılandırma hatası. Lütfen yöneticiyle iletişime geçin.",
  "details": "Eksik environment variables: SUPABASE_SERVICE_ROLE_KEY",
  "debug": {
    "hasServiceRoleKey": false,
    "hasSupabaseUrl": true
  }
}
```

#### 500 Internal Server Error - Genel Hata

```json
{
  "error": "Sunucu kimlik doğrulama hatası. Lütfen yöneticiyle iletişime geçin."
}
```

---

## 💻 Kullanım Örnekleri

### JavaScript/TypeScript (Fetch API)

```javascript
const response = await fetch('https://stocktakingred.netlify.app/api/auth/signup', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'password123',
    companyName: 'ABC Ltd. Şti.',
    fullName: 'Ahmet Yılmaz',
  }),
});

const result = await response.json();

if (response.ok) {
  console.log('Başarılı:', result.message);
} else {
  console.error('Hata:', result.error);
}
```

### Flutter/Dart (http package)

```dart
import 'dart:convert';
import 'package:http/http.dart' as http;

Future<void> signup() async {
  final url = Uri.parse('https://stocktakingred.netlify.app/api/auth/signup');
  
  final response = await http.post(
    url,
    headers: {
      'Content-Type': 'application/json',
    },
    body: json.encode({
      'email': 'user@example.com',
      'password': 'password123',
      'companyName': 'ABC Ltd. Şti.',
      'fullName': 'Ahmet Yılmaz',
    }),
  );

  final result = json.decode(response.body);

  if (response.statusCode == 200) {
    print('Başarılı: ${result['message']}');
  } else {
    print('Hata: ${result['error']}');
  }
}
```

### cURL

```bash
curl -X POST https://stocktakingred.netlify.app/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123",
    "companyName": "ABC Ltd. Şti.",
    "fullName": "Ahmet Yılmaz"
  }'
```

### Postman

1. Method: `POST`
2. URL: `https://stocktakingred.netlify.app/api/auth/signup`
3. Headers:
   - `Content-Type: application/json`
4. Body (raw JSON):
```json
{
  "email": "user@example.com",
  "password": "password123",
  "companyName": "ABC Ltd. Şti.",
  "fullName": "Ahmet Yılmaz"
}
```

---

## ⚙️ İşlem Akışı

Endpoint şu adımları gerçekleştirir:

1. **Validasyon:**
   - Tüm parametrelerin varlığı kontrol edilir
   - Şifre uzunluğu kontrol edilir (minimum 6 karakter)
   - Email otomatik olarak lowercase'e çevrilir ve trim edilir
   - Diğer string parametreler trim edilir

2. **Auth Kullanıcı Oluşturma:**
   - Supabase Auth'ta yeni kullanıcı oluşturulur
   - Email otomatik olarak onaylanır (`email_confirm: true`)
   - User metadata'ya `full_name` ve `company_name` eklenir

3. **Firma Oluşturma:**
   - `companies` tablosuna yeni firma kaydı eklenir
   - Firma ID'si alınır

4. **Kullanıcı Kaydı:**
   - `users` tablosuna kullanıcı kaydı eklenir
   - Kullanıcıya otomatik olarak `admin` rolü verilir
   - Kullanıcı firma ile ilişkilendirilir

5. **Hata Durumunda Temizlik:**
   - Herhangi bir adımda hata olursa, önceki adımlar geri alınır (rollback)

---

## ✅ Validasyon Kuralları

1. **Email:**
   - Zorunlu
   - Otomatik lowercase'e çevrilir
   - Trim edilir
   - Supabase tarafından email formatı kontrol edilir

2. **Password:**
   - Zorunlu
   - Minimum 6 karakter
   - Trim edilmez (şifrelerde boşluk olabilir)

3. **Company Name:**
   - Zorunlu
   - Trim edilir
   - Boş string olamaz

4. **Full Name:**
   - Zorunlu
   - Trim edilir
   - Boş string olamaz

---

## 🔒 Güvenlik Notları

- Endpoint server-side çalışır (Service Role Key kullanır)
- Şifreler plain text olarak gönderilir (HTTPS üzerinden)
- Email adresleri otomatik olarak lowercase'e çevrilir
- İlk kullanıcı otomatik olarak `admin` rolü alır
- Email otomatik olarak onaylanır (`email_confirm: true`)

---

## 📝 Notlar

- Endpoint, Supabase Service Role Key gerektirir
- Environment variables'ların Netlify'da doğru yapılandırılmış olması gerekir
- Başarılı kayıt sonrası kullanıcı otomatik olarak giriş yapabilir (Flutter tarafında Supabase ile)
- Hata durumunda detaylı log'lar server-side'da tutulur

---

## 🐛 Yaygın Hatalar

### "Sunucu kimlik doğrulama hatası"
- **Sebep:** Environment variables eksik veya yanlış
- **Çözüm:** Netlify'da `SUPABASE_SERVICE_ROLE_KEY` ve `NEXT_PUBLIC_SUPABASE_URL` kontrol edin

### "Bu email adresiyle daha önce kayıt yapılmış"
- **Sebep:** Email zaten Supabase Auth'ta kayıtlı
- **Çözüm:** Farklı bir email kullanın veya mevcut kullanıcıyı silin

### "Şifre en az 6 karakter olmalıdır"
- **Sebep:** Şifre çok kısa
- **Çözüm:** Minimum 6 karakterlik şifre kullanın


