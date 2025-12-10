# Supabase Kurulum Kontrol Listesi

## ✅ Yapılması Gerekenler

### 1. Supabase Dashboard'a Giriş
- https://supabase.com/dashboard adresine gidin
- Projenizi seçin

### 2. Tabloları Kontrol Edin

**Table Editor** → Şu tablolar olmalı:

#### `companies` Tablosu
- `id` (uuid, primary key)
- `name` (text)
- `created_at` (timestamp)
- `updated_at` (timestamp)

#### `users` Tablosu
- `id` (uuid, primary key, foreign key → auth.users)
- `company_id` (uuid, foreign key → companies.id)
- `full_name` (text)
- `email` (text)
- `role` (text) - 'admin', 'manager', 'user', 'main_admin'
- `created_at` (timestamp)
- `updated_at` (timestamp)

### 3. RLS (Row Level Security) Politikaları

**Authentication** → **Policies** bölümünde:

#### `companies` Tablosu için:
```sql
-- Companies: Herkes kendi firmasını görebilir
CREATE POLICY "companies_select_own" ON companies
  FOR SELECT
  USING (
    id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

-- Companies: Admin kullanıcılar firma oluşturabilir (signup sırasında)
CREATE POLICY "companies_insert_admin" ON companies
  FOR INSERT
  WITH CHECK (true); -- Service role kullanıldığı için kontrol gerekmez
```

#### `users` Tablosu için:
```sql
-- Users: Kendi kaydını görebilir
CREATE POLICY "users_select_own" ON users
  FOR SELECT
  USING (id = auth.uid());

-- Users: Aynı firmadaki kullanıcıları görebilir
CREATE POLICY "users_select_company" ON users
  FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

-- Users: Kayıt sırasında kendi kaydını ekleyebilir
CREATE POLICY "users_insert_own" ON users
  FOR INSERT
  WITH CHECK (id = auth.uid());

-- Users: Admin kullanıcılar firma içinde kullanıcı ekleyebilir
CREATE POLICY "users_insert_admin" ON users
  FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid() AND role IN ('admin', 'main_admin')
    )
  );
```

### 4. Email Confirmation Ayarları

**Authentication** → **Settings** → **Email Auth**:
- ✅ "Enable email confirmations" - **KAPALI** olmalı (çünkü kodda `email_confirm: true` kullanılıyor)
- Veya açık bırakıp kullanıcıların email onaylaması beklenebilir

### 5. Environment Variables Kontrolü

`.env.local` dosyasında şunlar olmalı:
```
NEXT_PUBLIC_SUPABASE_URL=https://coslphxfuttaaharpovp.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Supabase Dashboard** → **Settings** → **API**:
- Project URL: `NEXT_PUBLIC_SUPABASE_URL` ile eşleşmeli
- anon/public key: `NEXT_PUBLIC_SUPABASE_ANON_KEY` ile eşleşmeli
- service_role key: `SUPABASE_SERVICE_ROLE_KEY` ile eşleşmeli

### 6. Test Etme

Kayıt işlemi sonrası kontrol edin:

1. **Supabase Dashboard** → **Authentication** → **Users**
   - Yeni kullanıcı listede görünmeli
   - Email confirmed: ✅ olmalı

2. **Table Editor** → **companies**
   - Yeni firma oluşturulmuş olmalı

3. **Table Editor** → **users**
   - Yeni kullanıcı listede görünmeli
   - `company_id` doğru firma ile eşleşmeli
   - `role` = 'admin' olmalı

## 🔧 Sorun Giderme

### Kayıt sırasında hata alıyorsanız:

1. **"Invalid API key" hatası:**
   - `.env.local` dosyasındaki key'leri kontrol edin
   - Supabase Dashboard'dan yeni key'ler alın

2. **"Permission denied" hatası:**
   - RLS politikalarını kontrol edin
   - Service role key'in doğru olduğundan emin olun

3. **"Table does not exist" hatası:**
   - Tabloların oluşturulduğundan emin olun
   - SQL Editor'den tabloları oluşturun

4. **"Foreign key constraint" hatası:**
   - `users.company_id` → `companies.id` ilişkisini kontrol edin
   - Foreign key constraint'in doğru tanımlandığından emin olun

5. **"Email address is invalid" hatası (Flutter/Mobile):**
   - **Supabase Dashboard** → **Authentication** → **Settings** → **Email Auth**
   - **"Enable email confirmations"** ayarını kontrol edin
   - **"Secure email change"** ayarını kontrol edin
   - **"Email template"** ayarlarını kontrol edin
   - **SMTP ayarları** yapılandırılmış mı kontrol edin
   - Eğer SMTP yapılandırılmamışsa, Supabase varsayılan email servisini kullanır ve bazı email adreslerini reddedebilir
   - **Çözüm:** SMTP sağlayıcısı yapılandırın (Gmail, SendGrid, vb.) veya test için email confirmation'ı kapatın

## 📝 SQL Script Örneği (Tablolar yoksa)

Eğer tablolar yoksa, Supabase SQL Editor'de şunu çalıştırın:

```sql
-- Companies tablosu
CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Users tablosu
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'manager', 'user', 'main_admin')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS'i etkinleştir
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Index'ler
CREATE INDEX IF NOT EXISTS idx_users_company_id ON users(company_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
```

