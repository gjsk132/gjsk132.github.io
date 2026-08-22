---
summary: 하나의 범용 API를 여러 클라이언트가 나눠 쓸 때 생기는 문제와, 화면 전용 백엔드로 조립 책임을 옮기는 BFF 패턴 정리
date: 2026-08-02
category: TIL
tags:
  - BFF
  - backend-for-frontend
  - architecture
  - SDUI
---
## 하나의 API를 여럿이 나눠 쓸 때

서버 하나가 웹, iOS, Android, 심지어 외부 파트너까지 상대한다고 해보자.
보통은 **범용 API** 하나를 두고 모두가 같은 엔드포인트를 호출한다.

문제는 클라이언트마다 필요한 데이터가 다르다는 것이다.

- 모바일 목록 화면: 썸네일·제목·가격 정도만 필요
- 웹 상세 화면: 리뷰 전문, 판매자 정보, 배송 정책까지 필요
- 워치 앱: 제목 한 줄이면 충분

같은 `GET /products/{id}`를 부르는데, 누구는 응답의 90%를 버리고 누구는 부족해서 API를 여러 번 더 부른다.

## 범용 API의 한계

이 상황을 두 가지 증상으로 나눠 볼 수 있다.

- **Over-fetching** — 응답에 안 쓰는 필드가 잔뜩 딸려 온다. 모바일 목록인데 리뷰 배열까지 내려받는 식.
- **Under-fetching** — 한 화면을 그리는 데 필요한 데이터가 여러 API에 흩어져 있어, 클라이언트가 요청을 여러 번 날려 조립한다.

특히 under-fetching이 커지면, **화면을 조립하는 책임이 클라이언트로 넘어온다.**

~~~mermaid
flowchart LR
    Client["클라이언트 (화면 조립)"]
    A["GET /products/1"]
    B["GET /products/1/reviews"]
    C["GET /sellers/9"]
    D["GET /shipping/policy"]

    Client --> A
    Client --> B
    Client --> C
    Client --> D
~~~

상세 화면 하나를 위해 네 번을 부르고, 받아온 조각들을 클라이언트가 이어 붙인다.
API가 바뀌면 각 클라이언트(웹·iOS·Android)가 **각자** 조립 로직을 고쳐야 한다.

즉 범용 API는 "모두를 위한 API"라서 **어느 화면에도 딱 맞지 않는다.**

## BFF란 무엇인가

BFF(Backend for Frontend)는 **특정 프론트엔드를 위한 전용 백엔드 계층**이다.

범용 백엔드 앞에 클라이언트 종류별로 얇은 서버를 하나씩 두고, 그 서버가 **그 화면에 필요한 만큼만** 조립해서 내려준다.

~~~mermaid
flowchart LR
    Mobile["모바일 앱"]
    Web["웹"]
    MBFF["Mobile BFF"]
    WBFF["Web BFF"]
    Core["범용 백엔드 (products / reviews / sellers)"]

    Mobile --> MBFF
    Web --> WBFF
    MBFF --> Core
    WBFF --> Core
~~~

- 모바일 앱은 `Mobile BFF`의 `GET /screens/product-detail` **한 번**만 부른다.
- 그 안에서 BFF가 products·reviews·sellers를 모아, 모바일 화면에 필요한 모양으로 응답을 만든다.
- 웹은 별도의 `Web BFF`가 웹에 맞는 응답을 만든다.

핵심은 **조립 책임을 클라이언트에서 서버(BFF)로 옮긴다**는 것이다.

## 경계를 어디에 긋나

BFF의 본질은 "새 서버를 만드는 것"이 아니라 **책임의 경계를 다시 긋는 것**이다.

| 구분 | 범용 API | BFF |
|---|---|---|
| 화면 조립 | 클라이언트 | BFF |
| 응답 모양 | 모두에게 동일 | 클라이언트마다 다름 |
| API가 바뀔 때 | 각 클라이언트가 대응 | BFF가 흡수 |

여러 API를 모으고, 필요 없는 필드를 걷어내고, 화면이 원하는 형태로 다듬는 일 — 이 **조립(aggregation)** 을 어디서 할 것인가의 문제다.
클라이언트에 두면 배포가 무겁고 플랫폼마다 중복되지만, BFF에 두면 서버에서 한 번에 바꿀 수 있다.

## SDUI와의 관계

[0002](/blog/0002 - SDUI/)에서 "화면 구성을 서버가 결정하고 클라이언트는 그린다"는 SDUI를 정리했다.

그때 자연스럽게 남는 질문이 있다. **그 UI 정의 JSON은 누가 만들어 주나?**

범용 백엔드는 "제품 데이터"를 알지, "이 화면을 어떤 컴포넌트로 조립할지"는 모른다.
화면 단위로 응답을 만들어 주는 계층이 필요하고, 그게 사실상 BFF의 역할이다.

~~~mermaid
flowchart LR
    Core["범용 백엔드"]
    BFF["BFF"]
    Client["클라이언트"]
    Screen["화면"]

    Core -->|도메인 데이터| BFF
    BFF -->|화면 단위 UI 정의 JSON| Client
    Client -->|정의 해석 후 렌더링| Screen
~~~

- **범용 백엔드**: "무슨 데이터가 있나"
- **BFF**: "이 화면을 어떤 컴포넌트·순서·데이터로 구성할까" → SDUI 응답 조립
- **클라이언트**: "어떻게 그릴까"

즉 SDUI는 **응답을 어떻게 해석할지**의 약속이고, BFF는 **그 응답을 누가 만들지**의 자리다. 둘은 짝이다.

## 클라이언트 Repository 관점에서

[0004](/blog/0004 - Repository와 데이터 흐름/)에서 클라이언트의 Repository가 데이터 출처를 감추고 도메인 모델로 바꿔 올려보낸다고 했다.

BFF가 있으면 이 Repository가 상대하는 API의 성격이 달라진다.

- **BFF 없이(범용 API)**: Repository가 여러 API를 부르고, 응답 조각들을 도메인 모델로 조립한다. 조립 로직이 클라이언트에 있다.
- **BFF 있이**: Repository는 화면 단위 API 하나를 부른다. 조립은 이미 BFF가 끝냈다.

```kt
// BFF 없이 — Repository가 여러 소스를 모아 조립
suspend fun getProductDetail(id: Long): ProductDetail {
    val product = api.getProduct(id)
    val reviews = api.getReviews(id)
    val seller  = api.getSeller(product.sellerId)
    return ProductDetail(product, reviews, seller) // 조립 책임이 여기
}

// BFF 있이 — 화면 단위 응답 하나를 받아 매핑만
suspend fun getProductDetail(id: Long): ProductDetail {
    return bffApi.getProductDetailScreen(id).toDomain() // 조립은 BFF가 끝냄
}
```

클라이언트가 가벼워지는 대신, **조립의 복잡도가 사라지는 게 아니라 BFF로 옮겨갔을 뿐**이라는 점을 기억해야 한다.

## 트레이드오프

BFF가 공짜는 아니다.

- **서버가 하나 더 생긴다.** 클라이언트 종류마다 BFF를 두면 그만큼 배포·운영 대상이 늘어난다.
- **BFF끼리 중복이 생긴다.** Mobile BFF와 Web BFF가 비슷한 조립을 각자 하기도 한다. (공통 조립을 어디까지 공유할지가 또 하나의 설계 문제)
- **경계가 흐려질 위험.** BFF에 비즈니스 로직까지 스며들면, 얇은 조립 계층이 아니라 또 하나의 무거운 백엔드가 된다. BFF는 **화면을 위한 조립**까지만 맡는 게 원칙이다.

## 언제 BFF가 맞나

- 클라이언트 종류가 여럿이고, 화면마다 필요한 데이터 모양이 크게 다를 때
- under-fetching으로 클라이언트가 API를 여러 번 부르며 조립하고 있을 때
- SDUI처럼 **화면 단위 응답**을 서버가 만들어 줘야 할 때

반대로 클라이언트가 사실상 하나거나, 범용 API가 이미 화면과 잘 맞는다면 BFF는 과한 계층이 된다.
결국 BFF는 "조립 책임을 클라이언트에 둘 것인가, 서버 경계 안으로 들일 것인가"라는 선택의 문제다.
