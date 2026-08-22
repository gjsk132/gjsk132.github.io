---
summary: Android에서 링크가 앱 화면으로 연결되는 원리와 Deep Link, Custom Scheme, 검증된 App Link의 차이 정리
date: 2026-08-15
category: TIL
tags:
  - Deep-Link
  - App-Link
  - URI
  - Intent
  - android
---

## Android에서의 링크란?

링크라고 하면 보통 웹 브라우저에서 다른 페이지로 이동하는 URL을 떠올린다.

```text
https://example.com/products/42
```

하지만 Android에서 링크는 웹 페이지만 가리키는 것이 아니다.
링크를 눌렀을 때 앱을 열고, 홈 화면이 아니라 특정 상품이나 게시글 화면으로 바로 이동하게 만들 수도 있다.

예를 들어 사용자가 메시지에서 상품 링크를 눌렀다고 해보자.

- 앱이 없다면 웹의 상품 페이지를 연다.
- 앱이 있고 링크와 연결되어 있다면 앱의 상품 상세 화면을 연다.

즉 Android의 링크는 **외부에 표현된 주소를 앱 내부의 특정 화면과 연결하는 진입점**으로 사용할 수 있다.


### 앱에서 링크가 사용되는 방식

앱의 화면은 일반적으로 화면 전환 코드로 이동한다.

```kt
navController.navigate("product/42")
```

이 코드는 이미 앱 안에 있는 사용자를 상품 상세 화면으로 이동시킨다.
반면 링크는 브라우저, 검색 결과, 알림, QR 코드, 이메일, 다른 앱처럼 **앱 외부에서 같은 화면으로 들어올 수 있게 한다.**

```text
외부 링크 클릭
    ↓
Android가 링크를 처리할 앱 탐색
    ↓
앱 실행 또는 기존 앱으로 Intent 전달
    ↓
URI에서 상품 ID 42 추출
    ↓
앱의 상품 상세 화면으로 이동
```

링크가 화면 자체를 만드는 것은 아니다.
Android가 링크 정보를 `Intent`로 앱에 전달하면, 앱이 그 URI를 해석해 알맞은 화면으로 이동한다.


### 일반 웹 링크와 앱 화면 이동의 관계

웹에서는 URL이 웹 서버의 리소스를 가리킨다.

```text
https://example.com/products/42
```

앱에서는 같은 주소를 내부 화면의 목적지로 대응시킬 수 있다.

```text
/products/42 → ProductDetail(productId = 42)
```

따라서 링크는 웹 주소와 앱 내비게이션 사이의 약속이다.
웹과 앱이 같은 콘텐츠를 제공한다면 하나의 HTTPS 주소를 공유할 수 있고, 앱 전용 기능이라면 별도의 Custom Scheme을 사용할 수도 있다.


### URI 기본 구조

Android의 링크를 이해하려면 URI 구조를 먼저 알아야 한다.

```text
scheme://host:port/path?query#fragment
```

```text
https://shop.example.com:443/products/42?ref=message#review
```

| 구성 | 예시 | 역할 |
|---|---|---|
| Scheme | `https` | URI를 처리하는 방식 |
| Host | `shop.example.com` | 대상 도메인 또는 호스트 |
| Port | `443` | 접속 포트, 보통 생략 |
| Path | `/products/42` | 대상 리소스나 앱 화면 경로 |
| Query | `ref=message` | 추가 매개변수 |
| Fragment | `review` | 리소스 내부의 특정 위치 |

Custom Scheme도 같은 구조를 사용할 수 있다.

```text
myapp://products/42?ref=push
```

여기서는 `myapp`이 Scheme, `products`가 Host, `/42`가 Path다.


## Deep Link


### Deep Link란?

Deep Link는 사용자를 앱의 첫 화면에만 보내지 않고 **앱 내부의 특정 콘텐츠나 기능으로 바로 연결하는 링크**다.

```text
myapp://products/42
```

이 링크는 앱을 열기만 하는 것이 아니라 `42`번 상품의 상세 화면을 열어야 한다는 정보까지 담고 있다.

Android의 Deep Link는 Intent 시스템을 이용한다.
앱이 `AndroidManifest.xml`에 처리할 URI 규칙을 선언하면, Android는 해당 규칙과 들어온 링크를 비교해 처리 가능한 Activity를 찾는다.


### Deep Link의 동작 과정

~~~mermaid
flowchart LR
    Link["사용자가 링크 클릭"]
    Intent["Android가 ACTION_VIEW Intent 생성"]
    Match["설치된 앱의 Intent Filter와 비교"]
    Select["처리할 앱 결정"]
    Activity["Activity에 URI 전달"]
    Screen["앱 내부 화면으로 이동"]

    Link --> Intent
    Intent --> Match
    Match --> Select
    Select --> Activity
    Activity --> Screen
~~~

일반적인 처리 순서는 다음과 같다.

1. 사용자가 링크를 누른다.
2. Android가 URI를 담은 `ACTION_VIEW` Intent를 만든다.
3. 시스템이 설치된 앱의 Intent Filter 중 URI와 일치하는 항목을 찾는다.
4. 기본 앱이 있으면 그 앱을 열고, 하나만 일치하면 해당 앱을 연다.
5. 여러 앱이 일치하면 사용자가 앱을 선택해야 할 수 있다.
6. 선택된 Activity가 `intent.data`에서 URI를 읽고 내부 화면으로 이동한다.

여기서 중요한 점은 **Intent Filter가 일치한다고 해서 반드시 내 앱이 열리는 것은 아니라는 것**이다.
다른 앱도 같은 URI 규칙을 선언할 수 있기 때문이다.

특히 Android 12 이상에서는 검증되지 않은 일반 웹 링크가 기본적으로 브라우저에서 열릴 수 있다.
자신이 소유한 웹 도메인을 안정적으로 앱에 연결하려면 뒤에서 다룰 App Link가 필요하다.


### Custom Scheme

Custom Scheme은 앱이 직접 정의한 Scheme을 사용하는 방식이다.

```text
courmy://course/42
```

`https` 대신 앱 이름이나 서비스 이름을 Scheme으로 사용하므로 구현이 단순하고 별도의 웹 도메인이 없어도 된다.

하지만 Custom Scheme에는 소유권 검증이 없다.
다른 앱도 `courmy` Scheme을 처리한다고 선언할 수 있어 어떤 앱이 열릴지 보장할 수 없고, 일반 웹 주소가 아니므로 앱이 설치되지 않았을 때 보여줄 웹 페이지도 없다.


### 간단한 구현 방식

먼저 링크를 받을 Activity의 `AndroidManifest.xml`에 Intent Filter를 선언한다.

```xml
<activity
    android:name=".MainActivity"
    android:exported="true">

    <intent-filter>
        <action android:name="android.intent.action.VIEW" />

        <category android:name="android.intent.category.DEFAULT" />
        <category android:name="android.intent.category.BROWSABLE" />

        <data
            android:scheme="courmy"
            android:host="course" />
    </intent-filter>
</activity>
```

- `VIEW`: URI의 콘텐츠를 보여주는 Intent임을 나타낸다.
- `DEFAULT`: 암시적 Intent를 Activity가 받을 수 있게 한다.
- `BROWSABLE`: 브라우저 같은 앱 외부에서 Activity를 실행할 수 있게 한다.
- `data`: 처리할 URI의 Scheme, Host, Path 규칙을 선언한다.

이제 Activity에서 전달된 URI를 읽을 수 있다.

```kt
override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)

    val uri = intent?.data
    val courseId = uri?.pathSegments?.firstOrNull()

    // courseId를 검증한 뒤 해당 코스 화면으로 이동
}
```

`courmy://course/42`에서 `42`를 추출해 코스 상세 화면의 인자로 넘기는 방식이다.
실제 앱에서는 값의 누락이나 잘못된 형식, 로그인이 필요한 화면, 삭제된 콘텐츠 같은 경우도 함께 처리해야 한다.

Navigation Compose를 사용한다면 `navDeepLink`로 URI 패턴과 목적지를 연결할 수도 있다.

```kt
composable(
    route = "course/{courseId}",
    deepLinks = listOf(
        navDeepLink {
            uriPattern = "courmy://course/{courseId}"
        },
    ),
) { backStackEntry ->
    val courseId = backStackEntry.arguments?.getString("courseId")
    CourseDetailScreen(courseId = courseId)
}
```

Manifest는 어떤 Activity가 링크를 받을지 정하고, 내비게이션 코드는 받은 링크를 앱 내부의 어떤 화면에 연결할지 정한다.


## Android App Link


### App Link란?

Android App Link는 **앱과 웹사이트의 관계를 검증한 HTTP 또는 HTTPS Deep Link**다.

```text
https://courmy.example.com/course/42
```

링크의 모양은 평범한 웹 URL이지만, Android가 해당 도메인과 앱의 관계를 확인한 뒤 앱이 설치되어 있으면 연결된 화면을 바로 열 수 있다.

앱이 설치되어 있지 않다면 같은 URL이 브라우저에서 열리므로 웹 콘텐츠로 자연스럽게 이어질 수 있다.


### Deep Link와의 차이

App Link는 Deep Link와 완전히 별개의 기능이 아니다.
Deep Link의 Intent 기반 화면 이동에 **웹 도메인 소유권 검증**을 더한 형태다.

```text
Deep Link
├── Custom Scheme: courmy://course/42
├── 일반 Web Link: https://courmy.example.com/course/42
└── Android App Link: 검증된 https://courmy.example.com/course/42
```

Custom Scheme Deep Link는 같은 Scheme을 선언한 앱이 여럿일 수 있다.
반면 검증된 App Link는 Android가 웹사이트와 앱의 연결을 확인하므로, 사용자가 앱 선택 창을 거치지 않고 해당 앱으로 이동할 수 있다.


### HTTPS 기반 링크

App Link를 처리할 Activity에는 `android:autoVerify="true"`를 포함한 Intent Filter를 선언한다.

```xml
<intent-filter android:autoVerify="true">
    <action android:name="android.intent.action.VIEW" />

    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />

    <data android:scheme="http" />
    <data android:scheme="https" />
    <data android:host="courmy.example.com" />
</intent-filter>
```

`autoVerify`는 설치 과정에서 선언한 Host와 앱의 관계를 확인해 달라고 Android에 요청한다.

도메인에는 다음 위치에 `assetlinks.json` 파일을 배포한다.

```text
https://courmy.example.com/.well-known/assetlinks.json
```

```json
[
  {
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": "com.example.courmy",
      "sha256_cert_fingerprints": [
        "AA:BB:CC:DD:..."
      ]
    }
  }
]
```

이 파일에는 연결을 허용할 앱의 패키지 이름과 서명 인증서의 SHA-256 지문이 들어간다.


### 도메인 검증이 필요한 이유

Manifest 선언만으로 링크의 소유권이 생기지는 않는다.
누구나 자신의 앱에서 `https://courmy.example.com`을 처리하겠다고 선언할 수 있기 때문이다.

App Link 검증은 양쪽의 선언을 맞춰본다.

~~~mermaid
flowchart LR
    App["앱 Manifest<br/>이 도메인을 처리하겠다"]
    Android["Android 검증"]
    Web["assetlinks.json<br/>이 앱에 처리를 허용한다"]

    App --> Android
    Web --> Android
    Android --> Result["검증된 연결"]
~~~

1. 앱은 Manifest에 처리할 HTTPS 도메인을 선언한다.
2. 웹사이트는 `assetlinks.json`에 허용할 앱과 서명 인증서를 선언한다.
3. Android는 앱 설치 시 해당 파일을 가져와 두 선언이 일치하는지 확인한다.
4. 검증에 성공하면 그 도메인의 링크를 앱으로 바로 전달할 수 있다.

이 과정은 다른 앱이 링크를 가로채는 것을 막고, 사용자에게 앱 선택 창을 반복해서 보여주지 않기 위해 필요하다.

검증에 실패하면 App Link의 직접 연결을 보장할 수 없다.
패키지 이름, 릴리스 서명 인증서 지문, Host, `assetlinks.json`의 접근 경로를 함께 확인해야 한다. Play App Signing을 사용한다면 로컬 키가 아니라 Play Console에서 확인한 앱 서명 인증서 지문이 필요한 경우도 있다.


## Deep Link vs App Link

앞에서 본 것처럼 App Link도 넓은 의미에서는 Deep Link다.
아래 표에서는 차이를 분명히 보기 위해 **Custom Scheme Deep Link**와 **Android App Link**를 비교한다.

| 구분 | Custom Scheme Deep Link | Android App Link |
|---|---|---|
| 주소 예시 | `courmy://course/42` | `https://courmy.example.com/course/42` |
| Scheme | 앱이 정의한 Scheme | `http`, `https` |
| 웹 도메인 | 없어도 됨 | 필요함 |
| 소유권 검증 | 없음 | `assetlinks.json`으로 검증 |
| 앱 선택 가능성 | 다른 앱도 같은 Scheme을 선언할 수 있음 | 검증 성공 시 연결된 앱으로 직접 이동 |
| 앱 미설치 시 | 처리할 앱이 없어 실패할 수 있음 | 웹 페이지로 이동 가능 |
| 구현 범위 | 앱의 Intent Filter 중심 | 앱 설정과 웹 서버 설정 모두 필요 |
| 주요 용도 | 앱 전용 이동, 내부 연동, 빠른 실험 | 웹과 앱이 공유하는 공개 콘텐츠 |


### Custom Scheme Deep Link가 적합한 경우

- 연결할 웹사이트나 소유한 도메인이 없다.
- 링크가 외부 웹 콘텐츠가 아니라 앱 전용 기능을 나타낸다.
- 개발 중 빠르게 링크 기반 화면 이동을 확인한다.
- Scheme 충돌 가능성을 통제할 수 있는 앱 간 연동에 사용한다.

장점은 도메인과 서버 설정 없이 앱에서 간단히 구현할 수 있다는 것이다.
단점은 Scheme의 소유권을 증명할 수 없고, 앱이 설치되지 않았을 때 자연스럽게 이동할 웹 목적지가 없다는 것이다.


### Android App Link가 적합한 경우

- 웹사이트의 상품, 게시글, 코스 같은 콘텐츠를 앱 화면과 연결한다.
- 검색, 광고, 이메일, 메시지에 공유할 표준 HTTPS 주소가 필요하다.
- 앱이 설치되어 있으면 앱으로, 없으면 웹으로 보내고 싶다.
- 링크를 다른 앱이 가로채지 못하도록 신뢰할 수 있는 연결이 필요하다.

장점은 하나의 HTTPS 주소를 웹과 앱이 공유하고, 검증된 도메인에서 앱으로 자연스럽게 이동할 수 있다는 것이다.
단점은 소유한 도메인과 서버 설정이 필요하고, 앱 서명이나 `assetlinks.json` 설정이 어긋나면 검증이 실패한다는 것이다.


## 정리

Android에서 링크는 단순히 앱을 실행하는 주소가 아니라, 외부의 URI와 앱 내부 화면을 연결하는 진입점이다.

Deep Link는 이 연결을 만드는 전체 개념이고, Custom Scheme은 도메인 없이 간단히 앱 전용 링크를 만드는 방법이다. Android App Link는 HTTPS Deep Link에 도메인 검증을 추가해 웹사이트와 앱의 관계를 보장한다.

따라서 앱 전용 기능이나 제한된 연동에는 Custom Scheme이 간단할 수 있다.
하지만 자신이 소유한 웹 콘텐츠를 사용자에게 공유하고 앱과 웹을 자연스럽게 연결해야 한다면, 검증된 Android App Link를 사용하는 편이 적합하다.


## 참고

- [Android Developers - About deep links](https://developer.android.com/training/app-links)
- [Android Developers - Create deep links](https://developer.android.com/training/app-links/create-deeplinks)
- [Android Developers - About App Links](https://developer.android.com/training/app-links/about)
- [Android Developers - Verify App Links](https://developer.android.com/training/app-links/verify-applinks)
