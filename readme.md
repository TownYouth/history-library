# history-library
一个使用transform实现dom元素拖动的vue指令，对外部环境要求更少，不再依赖position，任何元素都可以高效拖动！

另外，兼容原生js、vue2、vue3！！

# 安装

```shell
npm i history-library --save
```

# 特点

+ 使用transform来实现元素的移动，性能更好
+ 不依赖position，不会修改top和left等定位属性，更健壮，任何元素都可以拖动
+ 可在原生js、vue2、vue3中使用

# 使用

如果需要将指令注册为全局指令，可通过安装插件来自动注册，该插件自动识别vue版本，会根据环境自动安装对应版本的指令。

```js
import { moveDirectivePlugin } from 'history-library'
// 安装插件（在vue2中app是Vue构造函数，而在vue3中app是createApp返回的对象）
app.use(moveDirectivePlugin).mount('#app')
```

在vue3、vue2、原生js中使用示例如下：

## vue3

### 注册为全局指令

安装`moveDirectivePlugin`插件，会在全局注册一个`v-move`的指令，添加了v-move指令的元素可自由拖动

```js
// main.js
import { createApp } from 'vue'
import App from './App.vue'
import { moveDirectivePlugin } from 'history-library'

const app = createApp(App);
// 根据环境自动注册为全局指令v-move
app.use(moveDirectivePlugin).mount('#app')

/*
使用：<div v-move> </div>
*/
```

### 注册为局部指令

```html
<template>
  <div ref="moveEle" v-move>
    <span>移动</span>
  </div>
</template>

<script setup lang='ts'>
import { moveDirective } from 'history-library';
// 注册局部指令
const vMove = moveDirective;
</script>

<script lang="ts">

/* 选项模式
import { moveDirective } from 'history-library';
export default {
  directives: {
    // 在模板中启用 v-move2
    move2: moveDirective
  }
}
 */
</script>

<style scoped>
div {
  width: 100px;
  height: 100px;
  border: brown 3px solid;
  background-color: green;
  cursor: move;
}
</style>
```



## vue2

### 注册为全局指令

安装`moveDirectivePlugin`插件，会在全局安装一个`v-move`的指令，添加了v-move指令的元素可自由拖动

```js
// main.js
import Vue from 'vue'
import App from './App.vue'

import {moveDirectivePlugin} from 'history-library'
Vue.use(moveDirectivePlugin) // 注册全局指令v-move

new Vue({
  render: (h) => h(App)
}).$mount('#app')

/*
使用：<div v-move> </div>
*/
```

### 注册为局部指令

```html
<template>
    <div v-move>
        <span>{{ title }}</span>
    </div>
</template>

<script>
import { moveDirectiveFor2 } from 'history-library';
export default {
    data() {
        return {
            title: '移动',
        }
    },
    directives: {
        // 注册局部指令
        move: moveDirectiveFor2
    }
}
</script>
  
<style scoped>
div {
    width: 100px;
    height: 100px;
    border: brown 3px solid;
    background-color: green;
    cursor: move;
}
</style>
```





## 原生js

在原生环境中，将拖动函数：`historyLibrary.toMove()`，注册为需要拖动dom元素的mousedown事件处理函数，即可让元素实现拖动。

```html
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>historyLibrary</title>
    <style>
        #move {
            width: 100px;
            height: 100px;
            background: #69c810;
            cursor: move;
        }
    </style>
</head>

<body>
    <div id="move">
        any dom moveable
    </div>
</body>
<script src="./dist/history-library.umd.js"></script>
<script>
    // historyLibrary.toMove() 返回监听mousedown事件的处理函数
    const movableAction = historyLibrary.toMove();
    document.querySelector('#move').addEventListener('mousedown', movableAction);
</script>

</html>
```

