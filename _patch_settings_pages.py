"""Patch settings.yaml: polish todo / equipment / envelope_comment groups."""
from pathlib import Path

path = Path(r"d:\Documents\halo-theme-hao\settings.yaml")
text = path.read_text(encoding="utf-8")

replacements = [
    (
        """    - group: todo
      label: 待办清单
      formSchema:
        - $formkit: array
          name: list
          label: 待办清单列表
          value: [ ]
          itemLabels:
            - type: text
              label: $value.seat
            - type: text
              label: $value.class_name
          children:
            - $formkit: text
              name: class_name
              label: 标题
              placeholder: 请输入标题
            - $formkit: radio
              name: seat
              label: 位置
              value: left
              options:
                - label: 左
                  value: left
                - label: 右
                  value: right
            - $formkit: array
              name: todo_list
              label: 内容列表
              value: [ ]
              itemLabels:
                - type: text
                  label: $value.completed
                - type: text
                  label: $value.content
              children:
                - $formkit: textarea
                  name: content
                  label: 内容
                  placeholder: 请输入内容
                - $formkit: radio
                  name: completed
                  label: 填写
                  value: false
                  options:
                    - label: 完成
                      value: true
                    - label: 未完成
                      value: false

    - group: equipment
      label: 我的装备
      formSchema:
        - $formkit: attachment
          name: backgroundImg
          label: 背景图
          width: "15rem"
          aspectRatio: "16/9"
          value: https://liuzhihang.com/upload/moments.png
          placeholder: 请输入图片地址
        - $formkit: text
          name: smallTitle
          label: 小标题
          value: 好物
        - $formkit: text
          name: bigTitle
          label: 大标题
          value: 实物装备推荐
        - $formkit: text
          name: detail
          label: 描述
          value: 跟我一起享受科技带来的乐趣

    - group: envelope_comment
      label: 留言板
      formSchema:
        - $formkit: switch
          label: 信笺
          name: enable_envelope_comment
          key: enable_envelope_comment
          id: enable_envelope_comment
          value: true
        - $formkit: code
          if: $get(enable_envelope_comment).value
          name: title
          label: 标题
          placeholder: 请输入内容
          value: <div align="center">留言板</div>
          height: 80px
          language: html
          help: 支持 HTML 语法
        - $formkit: group
          name: custom_pic
          if: $get(enable_envelope_comment).value
          label: 信笺图片
          value:
            cover:
            line:
            beforeimg:
            afterimg:
          children:
            - $formkit: attachment
              name: cover
              label: 头部图片
              placeholder: 请输入内容
              width: "15rem"
              aspectRatio: "20/15"
              value: "https://npm.elemecdn.com/hexo-butterfly-envelope/lib/violet.jpg"
            - $formkit: attachment
              name: line
              label: 底部图片
              placeholder: 请输入内容
              width: "15rem"
              aspectRatio: "20/15"
              value: "https://npm.elemecdn.com/hexo-butterfly-envelope/lib/line.png"
            - $formkit: attachment
              name: beforeimg
              label: 前半部分图片
              placeholder: 请输入内容
              width: "15rem"
              aspectRatio: "20/15"
              value: "https://npm.elemecdn.com/hexo-butterfly-envelope/lib/before.png"
            - $formkit: attachment
              name: afterimg
              label: 后半部分图片
              placeholder: 请输入内容
              width: "15rem"
              aspectRatio: "20/15"
              value: "https://npm.elemecdn.com/hexo-butterfly-envelope/lib/after.png"
        - $formkit: list
          if: $get(enable_envelope_comment).value
          name: message_list
          label: 正文
          addLabel: 添加标签
          help: 选项是默认给的值
          itemType: string
          value:
            - 有什么想问的？
            - 有什么想说的？
            - 有什么想吐槽的？
            - 哪怕是有什么想吃的，都可以告诉我哦~
          children:
            - $formkit: text
              index: "$index"
              validation: required
        - $formkit: text
          name: bottom
          if: $get(enable_envelope_comment).value
          label: 底部文本
          placeholder: 请输入内容
          value: 自动书记人偶竭诚为您服务！
          help: 仅支持单行文本
        - $formkit: number
          name: height
          if: $get(enable_envelope_comment).value
          label: 高度
          placeholder: 请输入内容
          help: 信封划出的高度
          value: 1024
""",
        """    - group: todo
      label: 待办清单
      formSchema:
        - $formkit: array
          name: list
          label: 待办分类
          help: 按左右两栏配置分类卡片，每张卡片下可添加多条待办事项；需创建自定义页面并选用 ToDoList 模板
          value: [ ]
          itemLabels:
            - type: text
              label: $value.seat
            - type: text
              label: $value.class_name
          children:
            - $formkit: text
              name: class_name
              label: 分类标题
              placeholder: 例如：学习计划 / 生活琐事
              help: 显示在待办卡片顶部的分类名称
            - $formkit: toggle
              name: seat
              label: 栏位位置
              value: left
              help: 决定该分类出现在待办页左侧还是右侧
              render-type: text
              size: 48
              gap: 8
              options:
                - label: 左栏
                  value: left
                  render: 左
                - label: 右栏
                  value: right
                  render: 右
            - $formkit: array
              name: todo_list
              label: 待办事项
              help: 该分类下的具体条目，可标记完成状态
              value: [ ]
              itemLabels:
                - type: text
                  label: $value.completed
                - type: text
                  label: $value.content
              children:
                - $formkit: textarea
                  name: content
                  label: 事项内容
                  placeholder: 例如：读完一本技术书
                  help: 待办条目的正文描述
                - $formkit: toggle
                  name: completed
                  label: 完成状态
                  value: false
                  help: 已完成的事项会以划线样式展示
                  render-type: text
                  size: 64
                  gap: 8
                  options:
                    - label: 已完成
                      value: true
                      render: 完成
                    - label: 未完成
                      value: false
                      render: 未完成

    - group: equipment
      label: 我的装备
      formSchema:
        - $formkit: attachment
          name: backgroundImg
          label: 背景图
          width: "15rem"
          aspectRatio: "16/9"
          value: https://liuzhihang.com/upload/moments.png
          placeholder: 请输入图片地址，例如 https://example.com/equipment.png
          help: 装备页顶部横幅背景，建议 1920x480 横图；装备清单由「装备」插件维护
        - $formkit: text
          name: smallTitle
          label: 小标题
          value: 好物
          placeholder: 例如：好物
          help: 横幅上方的小字标题
        - $formkit: text
          name: bigTitle
          label: 大标题
          value: 实物装备推荐
          placeholder: 例如：实物装备推荐
          help: 横幅主标题
        - $formkit: text
          name: detail
          label: 描述
          value: 跟我一起享受科技带来的乐趣
          placeholder: 例如：跟我一起享受科技带来的乐趣
          help: 横幅下方的简介文案

    - group: envelope_comment
      label: 留言板
      formSchema:
        - $formkit: switch
          label: 启用信笺样式
          name: enable_envelope_comment
          key: enable_envelope_comment
          id: enable_envelope_comment
          value: true
          help: 开启后评论页以信封信笺样式展示留言引导区，关闭则仅保留普通评论
        - $formkit: code
          if: $get(enable_envelope_comment).value
          name: title
          label: 信笺标题
          placeholder: 例如：<div align="center">留言板</div>
          value: <div align="center">留言板</div>
          height: 80px
          language: html
          help: 信封展开后显示的标题区域，支持 HTML
        - $formkit: group
          name: custom_pic
          if: $get(enable_envelope_comment).value
          label: 信笺图片
          help: 信封各部位装饰图，可替换为站点风格素材
          value:
            cover:
            line:
            beforeimg:
            afterimg:
          children:
            - $formkit: attachment
              name: cover
              label: 头部封面图
              placeholder: 请输入图片地址
              width: "15rem"
              aspectRatio: "20/15"
              value: "https://npm.elemecdn.com/hexo-butterfly-envelope/lib/violet.jpg"
              help: 信封展开后顶部展示的封面图
            - $formkit: attachment
              name: line
              label: 分隔线图片
              placeholder: 请输入图片地址
              width: "15rem"
              aspectRatio: "20/15"
              value: "https://npm.elemecdn.com/hexo-butterfly-envelope/lib/line.png"
              help: 正文与底部文案之间的装饰分隔线
            - $formkit: attachment
              name: beforeimg
              label: 信封前半部分
              placeholder: 请输入图片地址
              width: "15rem"
              aspectRatio: "20/15"
              value: "https://npm.elemecdn.com/hexo-butterfly-envelope/lib/before.png"
              help: 信封未展开时的前半部分外观
            - $formkit: attachment
              name: afterimg
              label: 信封后半部分
              placeholder: 请输入图片地址
              width: "15rem"
              aspectRatio: "20/15"
              value: "https://npm.elemecdn.com/hexo-butterfly-envelope/lib/after.png"
              help: 信封未展开时的后半部分外观
        - $formkit: list
          if: $get(enable_envelope_comment).value
          name: message_list
          label: 引导文案
          addLabel: 添加一句
          help: 信封正文中轮播或列出的引导句子，可按需增删
          itemType: string
          value:
            - 有什么想问的？
            - 有什么想说的？
            - 有什么想吐槽的？
            - 哪怕是有什么想吃的，都可以告诉我哦~
          children:
            - $formkit: text
              index: "$index"
              validation: required
              placeholder: 例如：有什么想说的？
        - $formkit: text
          name: bottom
          if: $get(enable_envelope_comment).value
          label: 底部落款
          placeholder: 例如：自动书记人偶竭诚为您服务！
          value: 自动书记人偶竭诚为您服务！
          help: 信封底部单行落款文字，不支持 HTML
        - $formkit: number
          name: height
          if: $get(enable_envelope_comment).value
          label: 展开高度
          placeholder: 例如：1024
          help: 点击信封后划出内容区的高度（单位 px），内容较多时可调大
          value: 1024
""",
    ),
]

for i, (old, new) in enumerate(replacements, 1):
    if old not in text:
        raise SystemExit(f"Replacement {i} not found")
    text = text.replace(old, new, 1)
    print(f"ok {i}")

path.write_text(text, encoding="utf-8")
print("settings pages done")
