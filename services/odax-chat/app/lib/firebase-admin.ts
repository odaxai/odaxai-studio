import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: 'odaxai-cloud',
        clientEmail:
          'firebase-adminsdk-fbsvc@odaxai-cloud.iam.gserviceaccount.com',
        // Replace literal \n with actual newlines
        privateKey: process.env.FIREBASE_PRIVATE_KEY
          ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
          : `-----BEGIN PRIVATE KEY-----
MIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQCkN/N2+ZIPNC+b
j2JnnArTnKgPy68SBwsiRmNSM88YrraBT0afSIGZR2x9I6fKsIVeT+AunuQ20Rwb
MRnk21jzfI4BPJ3zJJ3cndS8w4Bolicfy/kBePUtwQPm7/Me+HQ+/8+Nbrk/I/QA
WUOFw2VPZS2Nl8v6jrEwdfQRIlBcx9jEJLmbYaVT5jTSABPJz0kMJhBZXUNfbH7y
70aiOPr8cBfOQ24Ly3g5mjE/ZL9zBKg0uyYJrKKA9v3XihS/fcROuB1KqXY3EDk/
/BUMKDR+MrB6yUVn7BKWrYmeyHpPy1KrJy5i/vUnKvK/rVL3ljvvk7u0bwB35vcI
nGRUi/svAgMBAAECggEAMfnHEZ+M+CyJCn3d1Cs0TkcADGKPwlw7YrBqHIOg1GGj
MAIYu3O84RFP7ltx/mivBc8oKff3+sizlYDhYPjx/pOawbyZUvwDQLcVnWafxvRf
LrmL64tMjiKN1fOTGQtCkUOXffLC1HjUEmEX//bBd6KSdONL09ImEVnsL2SycTFx
pcO/NFZE5oJzKSVBiqPYRtwMWLNX46xAC7CjBzRHmPRlq0NYxtGkSckOtjqMA97a
BgRE5rSUn8zcvIIF4QlqcTuQ/zwlVC/hNumk7yhQsoxWUtFiHHUVeeMSLsgsb6OE
HWFShn2xn/hy4KxmaP4hxZzNpBjIoGv6pOgg5BPp7QKBgQDTpvTLlX23IhURb9vn
C+g1aSviVVpQbwxZ/9TPGDkijMPebMp10svMID4rSHbsPOS6bQVZMINGKe/YwKfd
CqhhoBjQAz+QLcpG2/qpUVZCVu7zQQmG9LILW0e2gXDNaWErWyIBM4gv/HR4yRgw
zKWjNW+vtp248HkeRlnL/2G8HQKBgQDGoKanOiG0ijLSTlL9g7UYiytgQ5CM5UVd
zkaRPO4uBWgfiL/UATxEkWGCtC/XiBuHDvAK+RckieOkHmbp5wrt9aKd7yKGeijp
93tx0P8xfhPvPnajvBx5n5kxIYj/99o7HoiGTJDes4Ho+7uEbqQI/0QdBo88vpUX
PNfc8V06uwKBgDyf0faOd1gBdy9rbv2bN4Q0/9DwydHIPS16TiaTtanj0Cbh2owt
ORrbEXOsagP43TtZBvMpJjDuyji31l1GNDzicrkCdS6DLzFkyUO+fIq8A+3Bb00s
weLm3n+0S+9Kg/67N95IOHYmReZjE37G35sEL12RXVQf7VFyrT31hLUxAoGAfNDx
SL639Xquqwd7EUIVqAG0VT6/9DoS1/rKz3PJfHP7VW2alf/cvn3ZF8hhFAC8w6c4
YrzatSRNP5G3PB7q+FPWR4bBXF4hnbzd/szFwHUo07ud1BBemHMZUg1vyOIYafQq
+LHei4OkDCM8V+ErBVhblh3MHvDoQX0DbRzjaAcCgYBQ+9y4qfu079osc6xCK0Zt
Cj8YMSVgZCagEMzmBu3TWsp7nU2gauZc6F8Cb8fpQGrfhPc7yfkK4qY1MX8eVrFn
8j0wWtBXxby0VS/iQ7DQUqf/GYlSgXJtCzDkBClMUz4kXPvTXW0NrhFLM6m4Vd5V
PD0PLYEeNQU6fTqVeJq42w==
-----END PRIVATE KEY-----`, // Hardcoded fallback for now, assuming valid formatting
      }),
    });
    console.log('🔥 Firebase Admin Initialized');
  } catch (error: any) {
    console.error('❌ Firebase Admin Init Error:', error);
    // Don't swallow error, let it bubble so we see it in 500 response
    throw error;
  }
}

export const adminDb = admin.firestore();
