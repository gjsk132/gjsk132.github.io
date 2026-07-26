---
defines:
  - Smart Cast(스마트 캐스트): is나 != null 같은 검사를 통과하면, 그 블록 안에서는 컴파일러가 변수를 자동으로 좁혀진 타입으로 취급한다.
tags:
  - smart_cast
  - smartcast
  - 스마트_캐스트
---
## Smart Cast(스마트 캐스트)

`is`나 `!= null` 같은 검사를 통과하면, 그 블록 안에서는 컴파일러가 변수를 자동으로 좁혀진 타입으로 취급한다. 개발자가 `as`로 직접 캐스팅하지 않아도 된다.

```kt
fun describe(value: Any) {
    if (value is String) {
        // 이 블록 안에서 value는 String으로 스마트 캐스트된다
        println(value.length)
    }
}
```

널 검사에도 똑같이 적용된다. 검사 이후에는 `String?`이 `String`으로 좁혀져 `?.` 없이 접근할 수 있다.

```kt
val name: String? = ...
if (name != null) {
    println(name.length)
}
```

`when`에서 sealed 타입을 분기할 때도 각 분기 안에서 해당 하위 타입으로 스마트 캐스트된다.

### 적용 조건

검사 이후에 값이 바뀌지 않는다고 보장되는 **안정적인(stable) 대상**에만 적용된다. 지역 `val`은 되지만, 도중에 값이 바뀔 수 있는 `var` 프로퍼티나 커스텀 getter가 있는 프로퍼티에는 적용되지 않는다. 이 경우 값을 지역 변수에 먼저 받아 검사하면 된다.
