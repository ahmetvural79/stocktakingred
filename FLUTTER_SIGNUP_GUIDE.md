# Flutter Kayıt Sistemi - Web API Kullanımı

Web uygulamasındaki kayıt sistemini Flutter'da kullanmak için Next.js API endpoint'ini kullanabilirsiniz.

## 📋 API Endpoint Bilgileri

**Endpoint:** `POST /api/auth/signup`

**Base URL:** 
- Production: `https://your-domain.com`
- Local: `http://192.168.1.37:3000` (veya local IP'niz)

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "companyName": "Firma Adı",
  "fullName": "Ad Soyad"
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Firma kaydı ve kullanıcı oluşturuldu."
}
```

**Response (Error):**
```json
{
  "error": "Hata mesajı"
}
```

## 💻 Flutter Kodu Örneği

### 1. Signup Service Sınıfı

```dart
import 'dart:convert';
import 'package:http/http.dart' as http;

class SignupService {
  // Base URL'i buraya ekleyin
  static const String baseUrl = 'http://192.168.1.37:3000'; // Local için
  // static const String baseUrl = 'https://your-domain.com'; // Production için

  static Future<Map<String, dynamic>> signup({
    required String email,
    required String password,
    required String companyName,
    required String fullName,
  }) async {
    try {
      final url = Uri.parse('$baseUrl/api/auth/signup');
      
      final response = await http.post(
        url,
        headers: {
          'Content-Type': 'application/json',
        },
        body: json.encode({
          'email': email.trim().toLowerCase(),
          'password': password,
          'companyName': companyName.trim(),
          'fullName': fullName.trim(),
        }),
      );

      final data = json.decode(response.body);

      if (response.statusCode == 200) {
        return {
          'success': true,
          'message': data['message'] ?? 'Kayıt başarılı',
        };
      } else {
        return {
          'success': false,
          'error': data['error'] ?? 'Kayıt işlemi başarısız oldu',
        };
      }
    } catch (e) {
      return {
        'success': false,
        'error': 'Bağlantı hatası: ${e.toString()}',
      };
    }
  }
}
```

### 2. Signup Sayfası Örneği

```dart
import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'signup_service.dart';

class SignupPage extends StatefulWidget {
  @override
  _SignupPageState createState() => _SignupPageState();
}

class _SignupPageState extends State<SignupPage> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();
  final _companyNameController = TextEditingController();
  final _fullNameController = TextEditingController();
  
  bool _isLoading = false;
  String? _errorMessage;

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    _confirmPasswordController.dispose();
    _companyNameController.dispose();
    _fullNameController.dispose();
    super.dispose();
  }

  Future<void> _handleSignup() async {
    if (!_formKey.currentState!.validate()) {
      return;
    }

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
      // 1. API endpoint'ine kayıt isteği gönder
      final result = await SignupService.signup(
        email: _emailController.text,
        password: _passwordController.text,
        companyName: _companyNameController.text,
        fullName: _fullNameController.text,
      );

      if (!result['success']) {
        setState(() {
          _errorMessage = result['error'];
          _isLoading = false;
        });
        return;
      }

      // 2. Kayıt başarılı, şimdi Supabase ile giriş yap
      final supabase = Supabase.instance.client;
      final signInResponse = await supabase.auth.signInWithPassword(
        email: _emailController.text.trim().toLowerCase(),
        password: _passwordController.text,
      );

      if (signInResponse.user == null) {
        setState(() {
          _errorMessage = 'Hesap oluşturuldu ancak giriş yapılamadı';
          _isLoading = false;
        });
        return;
      }

      // 3. Başarılı - Ana sayfaya yönlendir
      Navigator.of(context).pushReplacementNamed('/home');
      
    } catch (e) {
      setState(() {
        _errorMessage = 'Kayıt işlemi başarısız: ${e.toString()}';
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Firma Kaydı'),
      ),
      body: SingleChildScrollView(
        padding: EdgeInsets.all(16),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              if (_errorMessage != null)
                Container(
                  padding: EdgeInsets.all(12),
                  margin: EdgeInsets.only(bottom: 16),
                  decoration: BoxDecoration(
                    color: Colors.red.shade50,
                    border: Border.all(color: Colors.red.shade200),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    _errorMessage!,
                    style: TextStyle(color: Colors.red.shade700),
                  ),
                ),
              
              TextFormField(
                controller: _companyNameController,
                decoration: InputDecoration(
                  labelText: 'Firma Adı *',
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
              
              TextFormField(
                controller: _fullNameController,
                decoration: InputDecoration(
                  labelText: 'Ad Soyad *',
                  border: OutlineInputBorder(),
                ),
                validator: (value) {
                  if (value == null || value.trim().isEmpty) {
                    return 'Ad soyad gereklidir';
                  }
                  return null;
                },
              ),
              SizedBox(height: 16),
              
              TextFormField(
                controller: _emailController,
                keyboardType: TextInputType.emailAddress,
                decoration: InputDecoration(
                  labelText: 'E-posta *',
                  border: OutlineInputBorder(),
                ),
                validator: (value) {
                  if (value == null || value.trim().isEmpty) {
                    return 'E-posta gereklidir';
                  }
                  if (!value.contains('@')) {
                    return 'Geçerli bir e-posta adresi girin';
                  }
                  return null;
                },
              ),
              SizedBox(height: 16),
              
              TextFormField(
                controller: _passwordController,
                obscureText: true,
                decoration: InputDecoration(
                  labelText: 'Şifre *',
                  border: OutlineInputBorder(),
                ),
                validator: (value) {
                  if (value == null || value.length < 6) {
                    return 'Şifre en az 6 karakter olmalıdır';
                  }
                  return null;
                },
              ),
              SizedBox(height: 16),
              
              TextFormField(
                controller: _confirmPasswordController,
                obscureText: true,
                decoration: InputDecoration(
                  labelText: 'Şifre (Tekrar) *',
                  border: OutlineInputBorder(),
                ),
                validator: (value) {
                  if (value == null || value.isEmpty) {
                    return 'Şifre tekrarı gereklidir';
                  }
                  return null;
                },
              ),
              SizedBox(height: 24),
              
              ElevatedButton(
                onPressed: _isLoading ? null : _handleSignup,
                style: ElevatedButton.styleFrom(
                  padding: EdgeInsets.symmetric(vertical: 16),
                  backgroundColor: Colors.red.shade600,
                ),
                child: _isLoading
                    ? CircularProgressIndicator(color: Colors.white)
                    : Text(
                        'Firma Kaydı Oluştur',
                        style: TextStyle(
                          fontSize: 16,
                          color: Colors.white,
                        ),
                      ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
```

### 3. pubspec.yaml Dependencies

```yaml
dependencies:
  flutter:
    sdk: flutter
  http: ^1.1.0
  supabase_flutter: ^2.0.0
```

## 🔧 Yapılandırma

### Base URL Ayarlama

`SignupService` sınıfındaki `baseUrl` değişkenini güncelleyin:

```dart
// Local development için
static const String baseUrl = 'http://192.168.1.37:3000';

// Production için
static const String baseUrl = 'https://your-domain.com';
```

### Supabase Yapılandırması

`main.dart` dosyanızda Supabase'i başlatın:

```dart
import 'package:supabase_flutter/supabase_flutter.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  await Supabase.initialize(
    url: 'YOUR_SUPABASE_URL',
    anonKey: 'YOUR_SUPABASE_ANON_KEY',
  );
  
  runApp(MyApp());
}
```

## ✅ Avantajlar

1. **Email Validation Sorunu Çözülür:** Service role key kullanıldığı için email validation sorunları olmaz
2. **Aynı Mantık:** Web ve mobil aynı backend'i kullanır
3. **Güvenlik:** Service role key client tarafında değil, server tarafında kullanılır
4. **Tutarlılık:** Tüm kayıt işlemleri aynı endpoint üzerinden yapılır

## 🐛 Hata Ayıklama

Eğer bağlantı hatası alırsanız:

1. Base URL'in doğru olduğundan emin olun
2. Next.js sunucusunun çalıştığından emin olun (`npm run dev`)
3. CORS ayarlarını kontrol edin (Next.js varsayılan olarak tüm origin'lere izin verir)
4. Network loglarını kontrol edin

## 📝 Notlar

- Email otomatik olarak lowercase'e çevrilir
- Şifre minimum 6 karakter olmalıdır
- Kayıt sonrası otomatik olarak giriş yapılır
- İlk kullanıcı otomatik olarak 'admin' rolü alır


