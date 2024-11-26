<template>
  <div ref="moveEle" v-move2>
    <span>移动</span>
  </div>
</template>

<script setup lang='ts'>
import { moveDirective } from 'history-library';
// 注册局部指令
const vMove2 = moveDirective;
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

<style scoped lang='scss'>
div {
  width: 100px;
  height: 100px;
  border: brown 3px solid;
  background-color: green;
  cursor: move;
}
</style>