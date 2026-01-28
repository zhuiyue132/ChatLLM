<!--
 * @Author       : zhuiyue132
 * @Date         : 2025-07-16
 * @LastEditors  : zhuiyue132
 * @LastEditTime : 2025-08-01
 * @FilePath     : /bi-agents/src/components/footer/index.vue
 * @Description  : 页脚组件
 * 
-->
<template>
  <div class="footer">
    <div>
      <div class="footer__bd">
        <a
          class="footer__item footer__item--no-margin link"
          href="https://beian.miit.gov.cn/#/Integrated/index"
          target="_blank"
        >
          苏ICP备2021033235号-3
        </a>
        <img class="footer__ver-line" src="@/assets/images/footer/vertical_divider.svg" alt="｜" />
        <span class="footer__item">使用条款</span>
        <span class="footer__item help">帮助</span>
      </div>
      <div class="footer__ft">
        <span class="footer__item footer__item--no-margin">电商BI系统</span>
      </div>
    </div>
  </div>
</template>

<script setup></script>

<style lang="scss" scoped>
.footer {
  position: relative;
  z-index: 9;
  display: flex;
  align-items: center;
  flex-direction: row;
  justify-content: space-between;
  width: 100%;
  height: 36px;
  color: #8c8c8c;
  font-size: 12px;

  & > div {
    display: flex;
    align-items: center;
    flex: 1;
    flex-direction: row;
    justify-content: space-between;
    margin: 0 auto;
    padding: 0 24px;

    .link {
      text-decoration: none;
      color: #8c8c8c;
    }

    img {
      margin: 0 16px;
      vertical-align: middle;
    }

    .help {
      margin-left: 16px;
    }

    .footer__item {
      cursor: pointer;
    }
  }
}

/* 针对首页 footer 特殊样式 */
.footer.agents-home-page-footer {
  transition: padding-left 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  border-top: 1px solid #d4dbe9;
}

.footer-padding-left {
  padding-left: 295px;
}
</style>
