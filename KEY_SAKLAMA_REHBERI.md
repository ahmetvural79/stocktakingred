# 🔐 Key'lerin Saklanma Yerleri ve Güvenlik

## 📍 Key'ler Nerede Saklanıyor?

### 1. 🏠 **Local Geliştirme Ortamı (Bilgisayarınızda)**

**Konum:** Proje klasörünüzde `.env.local` dosyası olmalı (ama şu an yok)

**Dosya yolu:**
```
C:\Users\HP\Documents\stocktakingred\.env.local
```

**İçeriği şöyle olmalı:**
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Önemli:**
- ✅ Bu dosya `.gitignore`'da, yani **Git'e commit edilmez**
- ✅ Sadece sizin bilgisayarınızda kalır
- ✅ Başkaları göremez

---

### 2. ☁️ **Netlify (Production Ortamı)**

**Konum:** Netlify Dashboard → Site settings → Environment variables

**Nasıl saklanıyor:**
- Netlify'ın güvenli veritabanında şifreli olarak saklanıyor
- Sadece Netlify yöneticileri ve siz görebilirsiniz
- Her deploy'da otomatik olarak yükleniyor

**Erişim:**
```
https://app.netlify.com
  → Projeniz
    → Site settings
      → Environment variables
```

**Güvenlik:**
- ✅ Netlify tarafından şifrelenmiş olarak saklanıyor
- ✅ Sadece server-side'da kullanılıyor (client-side'a gönderilmiyor)
- ✅ Log'larda görünmez (production'da)

---

### 3. 📦 **Git Repository (GitHub/GitLab)**

**Durum:** ❌ **Key'ler burada YOK ve OLMAMALI!**

**Kontrol:**
- `.gitignore` dosyasında `.env*` var
- Bu sayede `.env.local` dosyası Git'e commit edilmez
- ✅ **Güvenli!**

---

## 🔍 Mevcut Durum Kontrolü

### Local'de .env.local Dosyası Var mı?

**Kontrol etmek için:**
1. Proje klasörünüzde `.env.local` dosyası var mı bakın
2. Yoksa oluşturmanız gerekiyor (local geliştirme için)

### Netlify'da Environment Variables Var mı?

**Kontrol etmek için:**
1. https://app.netlify.com → Projeniz → Site settings → Environment variables
2. 3 variable'ın listede olup olmadığını kontrol edin

---

## ✅ Yapmanız Gerekenler

### 1. Local Geliştirme İçin .env.local Oluşturun

**Dosya oluşturma:**
1. Proje klasörünüzde (C:\Users\HP\Documents\stocktakingred) `.env.local` dosyası oluşturun
2. İçine şunları yazın:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Not:** `xxxxx` yerine gerçek Supabase URL'nizi ve key'lerinizi yazın.

### 2. Netlify'da Environment Variables Ekleyin

**Zaten yapmanız gereken bu!** (NETLIFY_SETUP_DETAYLI_REHBER.md'deki adımları takip edin)

---

## 🔐 Güvenlik Kontrol Listesi

### ✅ Güvenli Olanlar:
- [x] `.env.local` dosyası `.gitignore`'da (Git'e commit edilmez)
- [x] Key'ler kod içinde hardcode edilmemiş
- [x] `SUPABASE_SERVICE_ROLE_KEY` sadece server-side'da kullanılıyor
- [x] Netlify'da şifreli olarak saklanıyor

### ⚠️ Dikkat Edilmesi Gerekenler:
- [ ] `.env.local` dosyasını asla Git'e commit etmeyin
- [ ] Key'leri asla kod içinde yazmayın
- [ ] Key'leri asla public repository'de paylaşmayın
- [ ] `SUPABASE_SERVICE_ROLE_KEY`'i asla client-side'da kullanmayın

---

## 📝 Key'lerin Kullanım Yerleri

### Kodda Nasıl Okunuyor?

**Örnek (lib/supabase/admin.ts):**
```typescript
const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
```

**Nasıl çalışıyor:**
1. Next.js otomatik olarak `.env.local` dosyasını okur (local'de)
2. Netlify otomatik olarak Environment Variables'ı yükler (production'da)
3. `process.env.VARIABLE_NAME` ile erişilir

---

## 🎯 Özet

| Konum | Durum | Güvenlik |
|-------|-------|----------|
| **Local (.env.local)** | ❌ Henüz yok | ✅ Git'e commit edilmez |
| **Netlify** | ❌ Henüz eklenmedi | ✅ Şifreli saklanıyor |
| **Git Repository** | ✅ Key'ler yok | ✅ Güvenli |

---

## 🚀 Sonraki Adımlar

1. **Local için:** `.env.local` dosyası oluşturun (isteğe bağlı, sadece local geliştirme için)
2. **Netlify için:** Environment variables ekleyin (ZORUNLU, production için)
3. **Kontrol:** Diagnostic endpoint'i test edin

---

## ❓ Sık Sorulan Sorular

### S: Key'ler GitHub'da görünüyor mu?
**C:** Hayır! `.gitignore` dosyasında `.env*` var, bu yüzden Git'e commit edilmez.

### S: Netlify'da key'ler güvenli mi?
**C:** Evet! Netlify key'leri şifreli olarak saklar ve sadece server-side'da kullanır.

### S: Local'de .env.local olmadan çalışır mı?
**C:** Local geliştirme için gerekli. Production (Netlify) için gerekli değil, orada Environment Variables kullanılıyor.

### S: Key'leri nereden alabilirim?
**C:** Supabase Dashboard → Settings → API bölümünden.


