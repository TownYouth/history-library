# history-library
history-library 可以维护出一条浏览器页面跳转记录栈，在H5项目中应对动态流程返回指定页面场景问题很有效。



## 注意

由于浏览器对路由跳转步数的限制，项目中应尽可能保持最大跳转长度不超过50步。
在有iframe嵌套的情况下，还有一定缺陷，待续优化。


## 安装

通过 npm:

```
$ npm install history-library
```



## 基本用法

如：Vue

```typescript
// main.ts
import { $history } from 'history-library'

$history.init({ logDisabled: true }) // 初始化，亦可根据项目情况传入自定义配置
```

```vue
// page.vue
<template>
  <button @click="backToPage2">返回到 /page2</button>
</template>
<script setup>
import { $history, backByPath } from 'history-library'

const backToPage2 = () => {
  $history.backByPath('/page2') // 或 backByPath('/page2')
}
</script>
```



## API

### $history.init()
#### 类型
```typescript
function init(customOptions?: Partial<HistoryLibraryOptions>): void
```
#### 详细信息
初始化，可传入自定义配置，默认配置如下：
```typescript
interface HistoryLibraryOptions {
  /**
   * 自定义对比路径方法
   * @param href 路由栈中存储的完整路径，来自location.href，如：http://localhost.com:8888/a/b?a=123
   * @param path 外部传入的简略路径，如：a/b
   * @returns 是否相同，相同为 true
   */
  diffURL: (href: string, path: string) => boolean
  /**
   * 是否禁用log，true 为禁用，默认为 false
   */
  logDisabled: boolean
}
```
#### 示例
```typescript
// 如：vue main.ts
$history.init({ logDisabled: true }) // 禁用log
```



### $history.backByPath()、$history.forwardByPath()

#### 类型
```typescript
interface PopStateByPathOptions {
    path: string;
    relativeStep?: number;
    onFail?: onFailInterface;
    diffURL?: (href: string, path: string) => boolean;
}

interface backByPath {
    (path: string, relativeStep?: number, onFail?: onFailInterface): Promise<boolean>;
    (path: string, onFail?: onFailInterface): Promise<boolean>;
    (options: PopStateByPathOptions): Promise<boolean>;
}
interface forwardByPath {
    (path: string, relativeStep?: number, onFail?: onFailInterface): Promise<boolean>;
    (path: string, onFail?: onFailInterface): Promise<boolean>;
    (options: PopStateByPathOptions): Promise<boolean>;
}
```
#### 详细信息
在浏览器历史记录中，返回/前进至指定路径。

**参数说明：**
path: 目标页面的路径，默认为URL的Path部分，如：URL为：```http://localhost.com:8888/a/b?a=123```，则path为：a/b，如果不符合要求可以在全局配置中传入自定义diffURL方法，或者在本方法传入自定义diffURL方法；
relativeStep：相对步数，默认为0，即返回/前进至指定路径，正数为前进，负数为后退。适合目标页不确定但具有公共过程页面的情况；
onFail：失败回调，当返回/前进失败时(如：路由栈中没有匹配到该页面时)调用该方法；
diffURL：自定义对比路径方法。

**返回值：**

```Promise<boolean>``` 表示返回/前进是否成功，成功为true，失败为false。

#### 示例
```typescript
$history.backByPath('a/b', 0, () => {
	console.log('返回失败')
})

$history.backByPath('a/b', () => {
	console.log('返回失败')
})

$history.backByPath({
  path: 'a/b',
  relativeStep: 0,
  onFail: () => {
    console.log('返回失败')
  },
  diffURL: (href: string, path: string) => href === path
})
```



### $history.createAnchor()

#### 类型
```typescript
function createAnchor(anchorName: string | symbol): void
```
#### 详细信息
在当前路由创建一个锚点，提供于其他页面跳转。

**参数说明：**
anchorName: 锚点名称，作为跳转的唯一标识。

#### 示例
```typescript
// const.ts
const anchorName = Symbol('anchorName')
```
```vue
// page.vue
<script setup>
import { anchorName } from '@/const'
import { $history } from 'history-library'

$history.createAnchor(anchorName)
</script>
```


### $history.toAnchor()

#### 类型
```typescript
function toAnchor(anchorName: string | symbol, relativeStep?: number): Promise<boolean>
```
#### 详细信息
在浏览器历史记录中，跳转至指定锚点的路径。

**参数说明：**
anchorName: 锚点名称；
relativeStep：相对步数，默认为0，即返回/前进至指定路径，正数为前进，负数为后退。适合目标页不确定但具有公共过程页面的情况；

**返回值：**

Promise<boolean> 表示返回/前进是否成功，成功为true，失败为false。

#### 示例
```vue
// page2.vue
<script setup>
import { anchorName } from '@/const'
import { $history } from 'history-library'

$history.toAnchor(anchorName, 0)
</script>
```


### $history.addHistoryListener()、$history.removeHistoryListener()

#### 类型
```typescript
function addHistoryListener(callback: (type: 'popstate' | 'push' | 'replace') => void) => void
function removeHistoryListener(callback: (type: 'popstate' | 'push' | 'replace') => void) => void
```
#### 详细信息
添加/移除路由跳转监听，回调函数参数中返回跳转类型。

#### 示例
```typescript
function handleHistoryChange(type: 'popstate' | 'push' | 'replace') {
	console.log('发生了路由跳转', type)
}
$history.addHistoryListener(handleHistoryChange)
$history.removeHistoryListener(handleHistoryChange)
```
