# Meta Ads API Kurulumu

## 1. Facebook Developer Hesabi

1. [developers.facebook.com](https://developers.facebook.com) adresine git
2. Yeni bir App olustur (Business tipi)
3. App Dashboard'dan **Marketing API** iznini ekle

## 2. Ad Account ID

- Facebook Business Manager'da reklam hesabini bul
- Hesap ID'si `act_` ile baslar (ornek: `act_123456789`)
- Business Settings > Accounts > Ad Accounts altinda bulabilirsin

## 3. Access Token Alma

### Kisa Sureli Token (Short-lived, 1 saat)

1. [Graph API Explorer](https://developers.facebook.com/tools/explorer/) adresine git
2. Uygulamani sec
3. **Permissions** ekle: `ads_read`, `ads_management`
4. **Generate Access Token** tikla
5. Facebook ile oturum ac ve izin ver

### Uzun Sureli Token (Long-lived, 60 gun)

Kisa sureli token'i uzun sureliye cevir:

```
GET https://graph.facebook.com/v21.0/oauth/access_token?
  grant_type=fb_exchange_token&
  client_id={APP_ID}&
  client_secret={APP_SECRET}&
  fb_exchange_token={KISA_SURELI_TOKEN}
```

Donecek yanit:
```json
{
  "access_token": "EAAG...",
  "token_type": "bearer",
  "expires_in": 5184000
}
```

## 4. .env Dosyasini Ayarla

`.env` dosyasina asagidakileri ekle:

```
META_APP_ID=123456789
META_APP_SECRET=abc123def456
META_ACCESS_TOKEN=EAAG...uzun_token_buraya
META_AD_ACCOUNT_ID=act_123456789
```

## 5. Test Et

```bash
# Token ve baglanti testi (son 7 gun)
node scripts/01-fetch-data.js --source=meta --days=7

# Tarih araligi belirterek
node scripts/01-fetch-data.js --source=meta --start=2026-03-01 --end=2026-03-15

# Pipeline ile tam akis
node scripts/run-pipeline.js --source=meta --days=30 --sizes=feed
```

## 6. Token Yenileme

Long-lived token 60 gun gecerlidir. Suresi dolunca:
1. Hata mesaji: "Meta API token suresi dolmus veya gecersiz"
2. Yukaridaki adimlari tekrarlayarak yeni token al
3. `.env` dosyasindaki `META_ACCESS_TOKEN` degerini guncelle

## Sorun Giderme

| Hata | Cozum |
|------|-------|
| Token suresi dolmus (kod 190) | Yeni long-lived token al |
| Rate limit (kod 4, 17, 32) | Otomatik bekleme devrede, bir sey yapmaniza gerek yok |
| Izin hatasi (kod 10, 200) | App'e `ads_read` iznini ekle |
| Hesap bulunamadi | `META_AD_ACCOUNT_ID` degerini kontrol et (`act_` ile baslamali) |
