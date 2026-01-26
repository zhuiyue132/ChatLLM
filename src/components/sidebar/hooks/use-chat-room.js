/*
 * @Author       : zhuiyue132
 * @Date         : 2025-08-13
 * @LastEditors  : zhuiyue132
 * @LastEditTime : 2026-01-26
 * @FilePath     : /ChatLLM/src/components/sidebar/hooks/use-chat-room.js
 * @Description  : 侧边栏的对话历史, 每一个对话视为一个房间，房间内包含多轮对话（在MainV2 布局组件中使用，所以先放hooks里吧）
 *
 */

import { ref, computed, watch } from "vue";
import { useEventBus } from "@vueuse/core";
import { ElMessageBox } from "element-plus";
import { CHAT_ROOM_COMMAND } from "@/config/symbol";
import { useInfiniteScroll } from "@vueuse/core";
import dayjs from "dayjs";
import { wait } from "@/utils";

export const useChatRoom = (pageSize = 999999999, route = null) => {
  const chatRoomList = ref([]);
  const isLoading = ref(false);
  const isFinished = ref(false);
  const isCompleted = ref(false);

  // 获取URL中的agentId参数
  const agentIdFromUrl = ref(route?.query?.agentId || null);

  // 根据agentId过滤后的聊天房间列表
  const filteredChatRoomList = computed(() => {
    if (!agentIdFromUrl.value) {
      if (route.path.includes("/completions")) {
        return chatRoomList.value.filter(
          (room) => room.agentId === 0 || room.agentId === 1,
        );
      }
      // 如果没有agentId参数，显示所有对话房间
      return chatRoomList.value;
    }
    // 如果有agentId参数，只显示该agent的对话房间
    if (agentIdFromUrl.value === "0" || agentIdFromUrl.value === "1") {
      return chatRoomList.value.filter(
        (room) => room.agentId === 0 || room.agentId === 1,
      );
    }
    return chatRoomList.value.filter(
      (room) => String(room.agentId) === String(agentIdFromUrl.value),
    );
  });

  const filteredChatRoomGroupList = computed(() => {
    const now = dayjs();
    // 获取各个时间段的开始时间（0点）
    const todayStart = now.startOf("day");
    const yesterdayStart = now.subtract(1, "day").startOf("day");
    const weekStart = now.subtract(7, "day").startOf("day");
    const monthStart = now.subtract(30, "day").startOf("day");

    // 定义分组规则（按优先级排序）
    const groupRules = [
      {
        key: "pinned",
        name: "置顶",
        matcher: (room) => room.topFlag,
      },
      {
        key: "today",
        name: "今天",
        matcher: (room) => {
          const roomTime = dayjs(room.createTime);
          return (
            roomTime.isSameOrAfter(todayStart) &&
            roomTime.isBefore(now.add(1, "day").startOf("day"))
          );
        },
      },
      {
        key: "yesterday",
        name: "昨天",
        matcher: (room) => {
          const roomTime = dayjs(room.createTime);
          return (
            roomTime.isSameOrAfter(yesterdayStart) &&
            roomTime.isBefore(todayStart)
          );
        },
      },
      {
        key: "week",
        name: "7天内",
        matcher: (room) => {
          const roomTime = dayjs(room.createTime);
          return (
            roomTime.isSameOrAfter(weekStart) &&
            roomTime.isBefore(yesterdayStart)
          );
        },
      },
      {
        key: "month",
        name: "30天内",
        matcher: (room) => {
          const roomTime = dayjs(room.createTime);
          return (
            roomTime.isSameOrAfter(monthStart) && roomTime.isBefore(weekStart)
          );
        },
      },
    ];

    // 初始化分组容器
    const groups = {};
    for (const rule of groupRules) {
      groups[rule.key] = [];
    }
    const historyGroups = {};

    // 单次遍历完成所有分组
    filteredChatRoomList.value.forEach((room) => {
      // 按优先级匹配分组规则
      const matchedRule = groupRules.find((rule) => {
        const result = rule.matcher(room);
        return result;
      });

      if (matchedRule) {
        groups[matchedRule.key].push(room);
      } else {
        // 超过30天的按月份分组
        const yearMonth = dayjs(room.createTime).format("YYYY-MM");
        if (!historyGroups[yearMonth]) {
          historyGroups[yearMonth] = [];
        }
        historyGroups[yearMonth].push(room);
      }
    });

    // 构建最终的分组列表
    const result = [];

    // 添加常规分组
    groupRules.forEach((rule) => {
      if (groups[rule.key].length > 0) {
        result.push({
          key: rule.key,
          groupName: rule.name,
          chatRoomList: groups[rule.key],
        });
      }
    });

    // 添加历史记录分组（按月份倒序）
    Object.keys(historyGroups)
      .sort((a, b) => b.localeCompare(a))
      .forEach((yearMonth) => {
        result.push({
          key: yearMonth,
          groupName: yearMonth,
          chatRoomList: historyGroups[yearMonth],
        });
      });

    // 最后调整result中各个分组中房间的顺序：pinned 分组按照 pinTime 字段时间倒序排序，其他分组按照 createTime 字段时间倒序排序
    result.forEach((group) => {
      if (group.key === "pinned") {
        group.chatRoomList.sort((a, b) => {
          return dayjs(b.pinTime).diff(dayjs(a.pinTime));
        });
      } else {
        group.chatRoomList.sort((a, b) => {
          return dayjs(b.createTime).diff(dayjs(a.createTime));
        });
      }
    });

    return result;
  });

  const eventBus = useEventBus(CHAT_ROOM_COMMAND);

  const handleCommand = ({ command, params }) => {
    console.log(222223333, command, params);
    switch (command) {
      case "delete":
        // 删除临时对话（不经过二次确认，直接删除）
        // TODO: 删除临时对话
        break;
      case "add-room":
        // 更新对话列表
        // 为了避免重复添加，先检查是否已存在
        if (chatRoomList.value.find((item) => item.taskId === params.taskId)) {
          return;
        }

        params.isTitleLoading = true;
        // 五秒后自动关闭
        setTimeout(() => {
          chatRoomList.value[0].isTitleLoading = false;
        }, 5000);

        chatRoomList.value.unshift(params);
        break;
      case "modify-title":
        setTimeout(async () => {
          // eslint-disable-next-line no-case-declarations
          const room = chatRoomList.value.find(
            (item) => item.taskId === params.taskId,
          );
          if (!room) return;
          room.isTitleLoading = true;
          room.content = "";

          const titles = params.title?.split("")?.filter(Boolean);

          for (let index = 0; index < titles.length; index++) {
            const t = titles[index];
            room.content += t;
            await wait(50);
          }

          setTimeout(() => {
            room.isTitleLoading = false;
          }, 200);
        }, 1500);

        break;
    }
  };

  eventBus.on(handleCommand);

  // 分页参数，后端采用游标分页
  const cursor = ref({
    lastCreateTime: null,
    lastId: null,
    pageSize,
    page: 1,
  });

  // 重置游标和数据
  const resetHistory = () => {
    chatRoomList.value = [];
    cursor.value = {
      lastCreateTime: null,
      lastId: null,
      pageSize,
      page: 1,
    };
    isFinished.value = false;
    isCompleted.value = false;
  };

  const getChatRoomList = () => {
    if (isFinished.value || isLoading.value) return Promise.resolve();

    isLoading.value = true;
  };

  const pinChatRoom = (params) => {
    const { taskId } = params || {};
  };

  const unpinChatRoom = (params) => {
    const { taskId } = params || {};
  };

  const renameChatRoom = (params) => {
    const { taskId } = params || {};
  };

  const deleteChatRoom = (params) => {
    return ElMessageBox.confirm(
      "删除后，聊天记录将不可恢复。",
      "确认删除对话？",
      {
        confirmButtonText: "确认",
        cancelButtonText: "取消",
        confirmButtonClass: "el-button--danger",
        type: "warning",
      },
    )
      .then(() => {})
      .catch(() => {
        // 用户取消删除操作
        return false;
      });
  };

  const createInfiniteScroll = (target) => {
    if (!target) return;

    useInfiniteScroll(
      target,
      () => {
        if (!isFinished.value && !isLoading.value) {
          return getChatRoomList();
        }
        return Promise.resolve([]);
      },
      {
        distance: 10,
        throttle: 300,
        canLoadMore: () => {
          return !isFinished.value;
        },
      },
    );
  };

  // 监听route变化，更新agentId参数
  if (route) {
    watch(
      () => route.query.agentId,
      (newAgentId) => {
        agentIdFromUrl.value = newAgentId || null;
      },
    );
  }

  return {
    isLoading,
    isFinished,
    isCompleted,
    chatRoomList,
    filteredChatRoomGroupList,
    agentIdFromUrl,
    resetHistory,
    getChatRoomList,
    pinChatRoom,
    unpinChatRoom,
    renameChatRoom,
    deleteChatRoom,
    createInfiniteScroll,
  };
};
