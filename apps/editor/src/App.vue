<!--
 * @Author: songshaohui shaohui.song@hjlysz.com
 * @Date: 2026-10-10 17:49:53
 * @LastEditors: songshaohui shaohui.song@hjlysz.com
 * @LastEditTime: 2026-11-04 16:03:16
 * @FilePath: \edit-visio\apps\editor\src\App.vue
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
-->
<template>
  <router-view />
  <ConfirmDialog />
</template>

<script setup lang="ts">
import ConfirmDialog from './components/ConfirmDialog.vue';
</script>
