# 知识短视频：跨阶段接口交付包

首先阅读 [`接口契约与协作规范.md`](接口契约与协作规范.md)。

```text
contracts/
├── README.md
├── 接口契约与协作规范.md
├── schemas/
│   ├── project-state.schema.json
│   ├── knowledge-package.schema.json
│   ├── production-script.schema.json
│   ├── animation-manifest.schema.json
│   └── revision-request.schema.json
├── examples/
│   ├── project-state.example.json
│   ├── knowledge-package.example.json
│   ├── production-script.example.json
│   ├── animation-manifest.example.json
│   └── revision-request.example.json
└── validate_contracts.py
```

五个示例为同一虚拟骰子知识视频项目的连续交付数据，可以分别作为各层 Mock 输入。公开数据契约不限制内部 Agent、脚本编译方式或动画技术栈。

## 快速验证

```bash
python -m pip install 'jsonschema>=4.18'
python validate_contracts.py
```

预期输出：

```text
PASS: five schemas, five linked examples, cross-stage checks, nine negative cases
```

验证覆盖格式、引用关系、时间范围和部分业务约束；不代替真实知识核验和动画效果验收。
