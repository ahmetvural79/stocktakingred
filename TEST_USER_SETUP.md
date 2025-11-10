# Test Kullanıcısı Oluşturma Rehberi

## 🚀 Hızlı Yöntem (Önerilen)

### Yöntem 1: Supabase Dashboard (En Kolay)

1. Supabase Dashboard'a gidin
2. **Authentication** > **Users** sekmesine gidin
3. **Add User** butonuna tıklayın
4. Bilgileri girin:
   - **Email:** `test@example.com`
   - **Password:** `test123456`
   - **Auto Confirm User:** ✅ (işaretleyin)
5. **Create User** butonuna tıklayın

### Yöntem 2: Supabase SQL Editor

```sql
-- Kullanıcı oluşturma (Supabase Auth üzerinden yapılmalı)
-- SQL ile direkt oluşturulamaz, Dashboard veya API kullanın
```

### Yöntem 3: API Endpoint (Geliştirme için)

```bash
# Test kullanıcısı oluştur
curl -X POST http://localhost:3000/api/test/create-test-user
```

**Not:** Bu endpoint production'da kaldırılmalı veya güvenli hale getirilmelidir.

## 📝 Test Kullanıcı Bilgileri

### Varsayılan Test Kullanıcısı

```
Email: test@example.com
Password: test123456
```

### Özel Test Kullanıcısı Oluşturma

```bash
curl -X POST http://localhost:3000/api/test/create-user \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@test.com",
    "password": "admin123",
    "fullName": "Admin User",
    "companyName": "Test Firma A"
  }'
```

## 🔧 Kullanıcıyı Firma ile İlişkilendirme

Kullanıcı oluşturulduktan sonra `users` tablosuna eklenmeli:

```sql
-- Kullanıcı ID'sini alın (Supabase Dashboard'dan)
-- Sonra users tablosuna ekleyin:

INSERT INTO users (id, company_id, full_name, email, role)
VALUES (
  'USER_ID_BURAYA',  -- Supabase Auth'dan gelen user ID
  '00000000-0000-0000-0000-000000000001',  -- Test Firma A ID
  'Test User',
  'test@example.com',
  'admin'
);
```

## ✅ Kontrol Listesi

- [ ] Supabase Dashboard'da kullanıcı oluşturuldu
- [ ] Email confirm edildi (Auto Confirm)
- [ ] `users` tablosuna kayıt eklendi
- [ ] `company_id` doğru atandı
- [ ] Login sayfasında giriş yapılabiliyor

## 🐛 Sorun Giderme

### "Invalid login credentials" hatası

1. Email'in doğru yazıldığından emin olun
2. Password'un doğru olduğundan emin olun
3. Kullanıcının email confirm edildiğinden emin olun

### "User not found in users table" hatası

1. `users` tablosuna kayıt ekleyin:
```sql
INSERT INTO users (id, company_id, full_name, email, role)
SELECT 
  auth.uid(),
  '00000000-0000-0000-0000-000000000001',
  'Test User',
  'test@example.com',
  'admin'
WHERE NOT EXISTS (
  SELECT 1 FROM users WHERE id = auth.uid()
);
```

### "Company not found" hatası

1. Test firması oluşturuldu mu kontrol edin:
```sql
SELECT * FROM companies WHERE name = 'Test Firma A';
```

2. Yoksa oluşturun:
```sql
INSERT INTO companies (id, name)
VALUES ('00000000-0000-0000-0000-000000000001', 'Test Firma A')
ON CONFLICT (id) DO NOTHING;
```

## 📚 İlgili Dosyalar

- `web/app/api/test/create-user/route.ts` - Özel kullanıcı oluşturma
- `web/app/api/test/create-test-user/route.ts` - Hızlı test kullanıcısı
- `supabase/migrations/002_seed_test_data.sql` - Test verileri

