---
summary: 정해진 몇 가지 중 하나를 표현하는 sealed class(sealed interface)를 이해하고, UI State와 에러 타입에 적용하는 방법 정리
date: 2026-07-26
category: TIL
tags:
  - sealed-class
  - sealed-interface
  - UI_State
  - error-handling
  - kotlin
---
## 정해진 종류를 타입으로 표현하기

코드를 짜다보면, 이 값은 정해진 몇 가지 중 하나인 경우가 자주 나온다.
- 화면: 로딩·성공·실패 중 하나
- 요청 실패: 네트워크·서버·미발견 중 하나

이렇게 **종류가 닫혀 있는 값**을 코틀린에서 여러 방법으로 표현할 수 있는데 그중에 sealed가 있다.

## sealed class란 무엇인가

sealed class는 하위 타입의 집합이 컴파일 시점에 고정되는 타입이다.
상위 타입을 상속하는 하위 타입은 같은 모듈 안에만 존재할 수 있고, 외부에서 새 하위 타입을 임의로 추가할 수 없다. 그래서 "닫힌 계층(closed hierarchy)"이라고 부른다.

```kt
sealed interface ProductUiState {
    data object Loading : ProductUiState
    data class Success(val products: List<Product>) : ProductUiState
    data class Error(val error: DataError) : ProductUiState
}
```

`ProductUiState`인 값은 반드시 `Loading`, `Success`, `Error` 중 하나고, 이 세 가지가 전부라는 사실을 컴파일러가 안다.

### 비슷한 것끼리 비교하기

| | 종류가 닫혀 있나 | 종류마다 다른 데이터를 갖나 |
|---|---|---|
| 일반 `interface` | X (누구나 구현) | O |
| `enum` | O | X (구조가 동일) |
| `sealed` | O | O |

- 일반 인터페이스는 누구나 구현할 수 있어 열려 있다. 하위 타입이 몇 개일지 컴파일러가 알 수 없다.
- enum도 닫힌 집합이지만, 각 상수는 같은 구조를 공유한다. `Success`만 목록을 갖고 `Error`만 에러를 갖는 식으로 종류마다 다른 데이터를 담을 수 없다.
- sealed는 닫혀 있으면서 종류마다 다른 데이터를 가질 수 있다.

## sealed class의 장점

1. 표현할 수 있는 값 == 실제 종류
 `ProductUiState`가 표현할 수 있는 값은 정확히 세 가지뿐이다. "로딩이면서 동시에 에러"처럼 현실에 없는 상태를 타입 차원에서 만들 수 없다.

2. `when`을 빠짐없이 강제함
값을 만들어내는 표현식 `when`은 모든 경우를 빠짐없이 다뤄야 한다(exhaustive).
그래서 값을 다 나열할 수 없는 `Int`나 `String` 같은 타입에는 보통 `else`로 나머지를 메꿔야 한다.

```kt
val label = when (count) {
    0 -> "없음"
    1 -> "하나"
    else -> "여러 개"   // else를 빼면 컴파일 에러
}
```

반면 sealed는 하위 타입이 전부 알려져 있어, 종류를 모두 나열하면 그 자체로 exhaustive가 된다. `else` 없이도 컴파일이 통과한다.

```kt
when (state) {
    is ProductUiState.Loading -> ShowLoading()
    is ProductUiState.Success -> ShowProducts(state.products)
    is ProductUiState.Error   -> ShowError(state.error)
}
```
### else가 없는게 뭐 어쩌라고?

새로운 종류를 추가할 때, 그 차이를 알 수 있다.

`else`가 있는 `when`의 경우: 실수하면 그냥 `else`로 감
`else`가 없는 `when`의 경우: 컴파일 에러가 나면서 처리가 빠진 곳을 컴파일러가 대신 짚어주게 됨

## 적용 1: UI State

화면 상태를 boolean 필드로 나열하는 방식부터 보자.

```kt
data class ProductUiState(
    val isLoading: Boolean = false,
    val products: List<Product> = emptyList(),
    val errorMessage: String? = null,
)
```

필드가 서로 독립적이라, 실제로는 있을 수 없는 조합까지 표현된다.

```kt
// 로딩 중인데 데이터도 있고 에러도 있다 - 화면은 뭘 그려야 하나?
ProductUiState(isLoading = true, products = listOf(product), errorMessage = "오류")
```

앞서 만든 sealed 버전과 비교하면 차이가 분명하다.

플래그 방식: 있을 수 없는 상태도 만들어짐 → 화면이 필드 조합을 매번 따져야 함
sealed 방식: 상태는 항상 셋 중 하나 → 각 상태는 자기 데이터만 가짐

### 셋으로 안 나뉠 때는?

단순히 `Loading / Success / Error` 3개의 상태로 부족한 경우도 있다.
(ex. 결과가 비어 있는 화면/목록을 유지한 채 새로고침하는 화면 등)

이때 sealed의 성질을 유지한 채 조정할 수 있도록 해야한다.

별개의 화면: 새로운 종류로 승격시킨다.

```kt
data object Empty : ProductUiState
```

특정 상태 안에서만 의미 있는 경우: 그 하위 타입 안에 필드로 둔다.

```kt
data class Success(
    val products: List<Product>,
    val isRefreshing: Boolean = false,
) : ProductUiState
```

`isRefreshing`은 `Success`일 때만 존재하므로 "로딩 중인데 새로고침 중" 같은 모순이 안 생긴다. 

아무 상태에서나 켜지는 플래그가 문제였고, 하위 타입 안에 가두면 그 값은 다시 실제 상태와 맞아떨어진다.

## 적용 2: 에러 타입

실패를 문자열 하나로 뭉뚱그리면 화면이 실패 종류에 따라 대응을 나눌 수 없다. 네트워크가 끊긴 것과 서버가 500을 반환한 것은 안내가 달라야 한다.

여기서도 종류를 sealed로 닫는 게 핵심이다.

예외(`Throwable`): 누구나 상속 가능 → 종류가 무한한 **열린 계층**
`DataError`(sealed): 앱이 다룰 실패만 → **닫힌 계층**

```kt
sealed interface DataError {
    data object Network : DataError
    data object Server : DataError
    data object NotFound : DataError
    data class Unknown(val throwable: Throwable) : DataError
}
```

Repository나 UseCase에서 잡은 예외를 이 도메인 에러로 번역해서 올려보낸다.
그러면 화면은 프레임워크의 예외 타입이 아니라 앱이 정의한 닫힌 종류를 기준으로 대응할 수 있다.

```kt
is ProductUiState.Error -> when (state.error) {
    DataError.Network  -> ShowMessage("네트워크 연결을 확인해주세요")
    DataError.Server   -> ShowMessage("잠시 후 다시 시도해주세요")
    DataError.NotFound -> ShowEmpty()
    is DataError.Unknown -> ShowMessage("알 수 없는 오류가 발생했어요")
}
```

## 언제 sealed class가 맞나

정해진 몇 가지 중 하나이고, 그 목록을 우리가 통제할 때(종류가 배타적이고 닫혀 있을 때) 사용하면 좋다.
