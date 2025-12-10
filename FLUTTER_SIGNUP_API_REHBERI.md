# 📱 Flutter Uygulaması için Signup API Rehberi

## 🎯 Genel Bakış

Bu rehber, web uygulamasındaki kayıt (signup) işleminin Flutter uygulamasında nasıl uygulanacağını detaylı olarak açıklar.

---

## 📡 API Endpoint Bilgileri

### Endpoint
```
POST https://stocktakingred.netlify.app/api/auth/signup
```

### Base URL
```
https://stocktakingred.netlify.app
```

### Tam URL
```
https://stocktakingred.netlify.app/api/auth/signup
```

---

## 📤 Request (İstek) Formatı

### HTTP Method
```
POST
```

### Headers
```dart
{
  'Content-Type': 'application/json',
}
```

### Request Body (JSON)
```json
{
  "email": "kullanici@example.com",
  "password": "sifre123",
  "companyName": "Firma Adı",
  "fullName": "Ad Soyad"
}
```

### Request Body Açıklaması

| Alan | Tip | Zorunlu | Açıklama |
|------|-----|---------|----------|
| `email` | string | ✅ Evet | Kullanıcının email adresi (küçük harfe çevrilir) |
| `password` | string | ✅ Evet | En az 6 karakter olmalı |
| `companyName` | string | ✅ Evet | Firma/şirket adı |
| `fullName` | string | ✅ Evet | Kullanıcının tam adı |

### Validasyon Kuralları

1. **Email:**
   - Boş olamaz
   - Otomatik olarak küçük harfe çevrilir
   - Trim (baş/son boşluklar temizlenir)

2. **Password:**
   - Boş olamaz
   - Minimum 6 karakter olmalı

3. **CompanyName:**
   - Boş olamaz
   - Trim edilir

4. **FullName:**
   - Boş olamaz
   - Trim edilir

---

## 📥 Response (Yanıt) Formatları

### ✅ Başarılı Response (200 OK)

```json
{
  "success": true,
  "message": "Firma kaydı ve kullanıcı oluşturuldu."
}
```

### ❌ Hata Response'ları

#### 1. Validation Hatası (400 Bad Request)

```json
{
  "error": "Email, şifre, firma adı ve ad soyad gereklidir."
}
```

veya

```json
{
  "error": "Şifre en az 6 karakter olmalıdır."
}
```

#### 2. Email Zaten Kayıtlı (409 Conflict)

```json
{
  "error": "Bu email adresiyle daha önce kayıt yapılmış."
}
```

#### 3. Sunucu Hatası (500 Internal Server Error)

```json
{
  "error": "Sunucu kimlik doğrulama hatası. Lütfen yöneticiyle iletişime geçin.",
  "details": "Environment variables eksik veya yanlış yapılandırılmış."
}
```

veya

```json
{
  "error": "Firma oluşturulamadı: [hata mesajı]"
}
```

veya

```json
{
  "error": "Kullanıcı kaydedilemedi: [hata mesajı]"
}
```

---

## 🔄 İşlem Akışı

### Backend'de Yapılan İşlemler (Sırayla)

1. **Request Validasyonu**
   - Tüm alanların dolu olduğu kontrol edilir
   - Şifre uzunluğu kontrol edilir

2. **Auth User Oluşturma**
   - Supabase Auth'ta kullanıcı oluşturulur
   - Email otomatik onaylanır (`email_confirm: true`)
   - User metadata'ya `full_name` ve `company_name` eklenir

3. **Company Oluşturma**
   - `companies` tablosuna yeni firma eklenir
   - Firma adı kaydedilir

4. **User Record Oluşturma**
   - `users` tablosuna kullanıcı kaydı eklenir
   - `role: 'admin'` olarak ayarlanır
   - `company_id` bağlantısı yapılır

### Hata Durumunda Rollback

Eğer herhangi bir adımda hata olursa:
- Oluşturulan auth user silinir
- Oluşturulan company silinir (eğer user insert başarısız olursa)
- Kullanıcıya uygun hata mesajı döndürülür

---

## 💻 Flutter Implementation Örneği

### 1. Model Sınıfları

```dart
// signup_request.dart
class SignupRequest {
  final String email;
  final String password;
  final String companyName;
  final String fullName;

  SignupRequest({
    required this.email,
    required this.password,
    required this.companyName,
    required this.fullName,
  });

  Map<String, dynamic> toJson() {
    return {
      'email': email.trim().toLowerCase(),
      'password': password,
      'companyName': companyName.trim(),
      'fullName': fullName.trim(),
    };
  }
}

// signup_response.dart
class SignupResponse {
  final bool success;
  final String? message;
  final String? error;
  final String? details;

  SignupResponse({
    required this.success,
    this.message,
    this.error,
    this.details,
  });

  factory SignupResponse.fromJson(Map<String, dynamic> json) {
    return SignupResponse(
      success: json['success'] ?? false,
      message: json['message'],
      error: json['error'],
      details: json['details'],
    );
  }
}
```

### 2. API Service

```dart
// signup_service.dart
import 'dart:convert';
import 'package:http/http.dart' as http;

class SignupService {
  static const String baseUrl = 'https://stocktakingred.netlify.app';
  static const String signupEndpoint = '/api/auth/signup';

  Future<SignupResponse> signup(SignupRequest request) async {
    try {
      final url = Uri.parse('$baseUrl$signupEndpoint');
      
      print('🌐 API Endpoint: $url');
      print('📧 Kayıt için email: "${request.email}"');
      print('📧 Firma adı: "${request.companyName}"');
      print('📧 Ad Soyad: "${request.fullName}"');
      print('📧 Şifre uzunluğu: ${request.password.length}');

      final response = await http.post(
        url,
        headers: {
          'Content-Type': 'application/json',
        },
        body: jsonEncode(request.toJson()),
      );

      print('📡 API Response Status: ${response.statusCode}');
      print('📡 API Response Body: ${response.body}');

      final responseData = jsonDecode(response.body) as Map<String, dynamic>;
      final signupResponse = SignupResponse.fromJson(responseData);

      if (response.statusCode == 200 && signupResponse.success) {
        return signupResponse;
      } else {
        // Hata durumu
        throw SignupException(
          signupResponse.error ?? 'Kayıt işlemi başarısız oldu',
          signupResponse.details,
          response.statusCode,
        );
      }
    } on http.ClientException catch (e) {
      throw SignupException(
        'İnternet bağlantısı hatası',
        e.message,
        0,
      );
    } on FormatException catch (e) {
      throw SignupException(
        'Sunucu yanıtı geçersiz',
        e.message,
        0,
      );
    } catch (e) {
      throw SignupException(
        'Beklenmeyen hata',
        e.toString(),
        0,
      );
    }
  }
}

// Custom Exception
class SignupException implements Exception {
  final String message;
  final String? details;
  final int statusCode;

  SignupException(this.message, this.details, this.statusCode);

  @override
  String toString() => message;
}
```

### 3. UI Implementation

```dart
// signup_screen.dart (örnek)
import 'package:flutter/material.dart';

class SignupScreen extends StatefulWidget {
  @override
  _SignupScreenState createState() => _SignupScreenState();
}

class _SignupScreenState extends State<SignupScreen> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();
  final _companyNameController = TextEditingController();
  final _fullNameController = TextEditingController();
  
  final _signupService = SignupService();
  bool _isLoading = false;
  String? _errorMessage;

  Future<void> _handleSignup() async {
    if (!_formKey.currentState!.validate()) {
      return;
    }

    // Şifre eşleşme kontrolü
    if (_passwordController.text != _confirmPasswordController.text) {
      setState(() {
        _errorMessage = 'Şifreler eşleşmiyor';
      });
      return;
    }

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final request = SignupRequest(
        email: _emailController.text,
        password: _passwordController.text,
        companyName: _companyNameController.text,
        fullName: _fullNameController.text,
      );

      final response = await _signupService.signup(request);

      if (response.success) {
        // Başarılı kayıt
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(response.message ?? 'Kayıt başarılı!'),
            backgroundColor: Colors.green,
          ),
        );
        
        // Login ekranına yönlendir veya otomatik giriş yap
        Navigator.pop(context);
      }
    } on SignupException catch (e) {
      setState(() {
        _errorMessage = e.message;
      });
    } catch (e) {
      setState(() {
        _errorMessage = 'Beklenmeyen bir hata oluştu: $e';
      });
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('Kayıt Ol')),
      body: SingleChildScrollView(
        padding: EdgeInsets.all(16),
        child: Form(
          key: _formKey,
          child: Column(
            children: [
              // Full Name
              TextFormField(
                controller: _fullNameController,
                decoration: InputDecoration(
                  labelText: 'Ad Soyad',
                  border: OutlineInputBorder(),
                ),
                validator: (value) {
                  if (value == null || value.trim().isEmpty) {
                    return 'Ad Soyad gereklidir';
                  }
                  return null;
                },
              ),
              SizedBox(height: 16),
              
              // Email
              TextFormField(
                controller: _emailController,
                keyboardType: TextInputType.emailAddress,
                decoration: InputDecoration(
                  labelText: 'Email',
                  border: OutlineInputBorder(),
                ),
                validator: (value) {
                  if (value == null || value.trim().isEmpty) {
                    return 'Email gereklidir';
                  }
                  if (!value.contains('@')) {
                    return 'Geçerli bir email adresi girin';
                  }
                  return null;
                },
              ),
              SizedBox(height: 16),
              
              // Company Name
              TextFormField(
                controller: _companyNameController,
                decoration: InputDecoration(
                  labelText: 'Firma Adı',
                  border: OutlineInputBorder(),
                ),
                validator: (value) {
                  if (value == null || value.trim().isEmpty) {
                    return 'Firma adı gereklidir';
                  }
                  return null;
                },
              ),
              SizedBox(height: 16),
              
              // Password
              TextFormField(
                controller: _passwordController,
                obscureText: true,
                decoration: InputDecoration(
                  labelText: 'Şifre',
                  border: OutlineInputBorder(),
                ),
                validator: (value) {
                  if (value == null || value.isEmpty) {
                    return 'Şifre gereklidir';
                  }
                  if (value.length < 6) {
                    return 'Şifre en az 6 karakter olmalıdır';
                  }
                  return null;
                },
              ),
              SizedBox(height: 16),
              
              // Confirm Password
              TextFormField(
                controller: _confirmPasswordController,
                obscureText: true,
                decoration: InputDecoration(
                  labelText: 'Şifre Tekrar',
                  border: OutlineInputBorder(),
                ),
                validator: (value) {
                  if (value == null || value.isEmpty) {
                    return 'Şifre tekrar gereklidir';
                  }
                  return null;
                },
              ),
              SizedBox(height: 24),
              
              // Error Message
              if (_errorMessage != null)
                Container(
                  padding: EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.red.shade50,
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: Colors.red),
                  ),
                  child: Row(
                    children: [
                      Icon(Icons.error, color: Colors.red),
                      SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          _errorMessage!,
                          style: TextStyle(color: Colors.red),
                        ),
                      ),
                    ],
                  ),
                ),
              SizedBox(height: 16),
              
              // Signup Button
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: _isLoading ? null : _handleSignup,
                  child: _isLoading
                      ? CircularProgressIndicator()
                      : Text('Kayıt Ol'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    _confirmPasswordController.dispose();
    _companyNameController.dispose();
    _fullNameController.dispose();
    super.dispose();
  }
}
```

---

## 🔑 Key Gereksinimleri

### ⚠️ ÖNEMLİ: Flutter Uygulamasında Key GEREKMEZ!

**Neden?**
- Signup işlemi server-side'da (Netlify API route'unda) yapılıyor
- `SUPABASE_SERVICE_ROLE_KEY` sadece server-side'da kullanılıyor
- Flutter uygulaması sadece HTTP request gönderiyor
- Key'ler Netlify'da environment variable olarak saklanıyor

**Flutter'da ne yapmalısınız?**
- Sadece API endpoint'ini çağırın
- Key'lere ihtiyacınız yok
- Sadece request body'yi gönderin

---

## 📋 Checklist: Flutter Implementation

### Gereksinimler
- [ ] `http` package'ı eklenmiş (`pubspec.yaml`)
- [ ] Signup request modeli oluşturulmuş
- [ ] Signup response modeli oluşturulmuş
- [ ] API service sınıfı oluşturulmuş
- [ ] Error handling implementasyonu yapılmış
- [ ] UI form validasyonu eklenmiş
- [ ] Loading state yönetimi yapılmış
- [ ] Error mesajları gösteriliyor
- [ ] Başarılı kayıt sonrası yönlendirme yapılıyor

### Test Senaryoları
- [ ] Tüm alanlar dolu olduğunda başarılı kayıt
- [ ] Email boş olduğunda hata
- [ ] Şifre 6 karakterden az olduğunda hata
- [ ] Firma adı boş olduğunda hata
- [ ] Ad soyad boş olduğunda hata
- [ ] Email zaten kayıtlı olduğunda hata (409)
- [ ] İnternet bağlantısı yokken hata
- [ ] Sunucu hatası durumunda hata mesajı gösterimi

---

## 🐛 Hata Yönetimi

### Hata Kodları ve Anlamları

| Status Code | Anlam | Kullanıcıya Gösterilecek Mesaj |
|-------------|-------|-------------------------------|
| 200 | Başarılı | "Kayıt başarılı!" |
| 400 | Validasyon hatası | Response'daki `error` mesajı |
| 409 | Email zaten kayıtlı | "Bu email adresiyle daha önce kayıt yapılmış." |
| 500 | Sunucu hatası | "Sunucu hatası. Lütfen daha sonra tekrar deneyin." |
| 0 | Network hatası | "İnternet bağlantınızı kontrol edin." |

### Hata Mesajları (Türkçe)

```dart
String getErrorMessage(int statusCode, String? error) {
  switch (statusCode) {
    case 400:
      return error ?? 'Geçersiz bilgi girdiniz. Lütfen kontrol edin.';
    case 409:
      return 'Bu email adresiyle daha önce kayıt yapılmış.';
    case 500:
      return 'Sunucu hatası. Lütfen yöneticiyle iletişime geçin.';
    case 0:
      return 'İnternet bağlantınızı kontrol edin.';
    default:
      return error ?? 'Bir hata oluştu. Lütfen tekrar deneyin.';
  }
}
```

---

## 🔄 Kayıt Sonrası İşlemler

### Web'de Yapılan
1. Kayıt başarılı olunca otomatik giriş yapılıyor
2. Dashboard'a yönlendiriliyor

### Flutter'da Yapılması Gerekenler

**Seçenek 1: Otomatik Giriş**
```dart
// Kayıt başarılı olduktan sonra
final supabase = Supabase.instance.client;
await supabase.auth.signInWithPassword(
  email: email,
  password: password,
);
Navigator.pushReplacementNamed(context, '/dashboard');
```

**Seçenek 2: Login Ekranına Yönlendir**
```dart
// Kayıt başarılı olduktan sonra
Navigator.pop(context); // Signup ekranını kapat
// Kullanıcı login ekranında email/password ile giriş yapar
```

---

## 📦 Gerekli Package'lar

### pubspec.yaml
```yaml
dependencies:
  flutter:
    sdk: flutter
  http: ^1.1.0  # API çağrıları için
  # Diğer package'larınız...
```

### Kurulum
```bash
flutter pub get
```

---

## 🧪 Test Endpoint'i

### Environment Check
Kayıt işleminden önce API'nin çalıştığını kontrol edin:

```
GET https://stocktakingred.netlify.app/api/health/env-check
```

**Beklenen Response:**
```json
{
  "status": "ok",
  "message": "Tüm environment variable'lar doğru yapılandırılmış"
}
```

---

## 📝 Özet

### Flutter'da Yapmanız Gerekenler:
1. ✅ API endpoint'ini çağırın: `POST /api/auth/signup`
2. ✅ Request body'yi gönderin: `{ email, password, companyName, fullName }`
3. ✅ Response'u parse edin
4. ✅ Hata durumlarını handle edin
5. ✅ Başarılı kayıt sonrası kullanıcıyı yönlendirin

### Yapmanız Gerekmeyenler:
1. ❌ Supabase key'lerini Flutter'da saklamanıza gerek yok
2. ❌ Supabase client'ı signup için kullanmanıza gerek yok
3. ❌ Email confirmation göndermenize gerek yok (otomatik onaylanıyor)

---

## 🆘 Sorun Giderme

### "Sunucu kimlik doğrulama hatası" alıyorsanız:
1. Netlify'da environment variables'ın eklendiğinden emin olun
2. Diagnostic endpoint'i kontrol edin: `/api/health/env-check`
3. Deploy'un tamamlandığından emin olun

### "Email zaten kayıtlı" hatası:
- Kullanıcıya farklı bir email kullanmasını söyleyin
- Veya login ekranına yönlendirin

### Network hatası:
- İnternet bağlantısını kontrol edin
- API endpoint'inin doğru olduğundan emin olun
- Timeout süresini artırın

---

## 📞 Destek

Sorun yaşarsanız:
1. API response'unu loglayın
2. Status code'u kontrol edin
3. Error message'ı okuyun
4. Diagnostic endpoint'i test edin


