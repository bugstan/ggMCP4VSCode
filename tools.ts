/**
 * 工具列表定义
 * 这里定义了所有可用的VSCode API工具
 */
export const tools = {
    get_open_in_editor_file_text: {
        name: 'get_open_in_editor_file_text',
        description: '获取当前在编辑器中打开的文件的完整文本内容。返回空字符串如果没有文件打开。',
        inputSchema: {
            type: 'object',
            properties: {}
        }
    },

    get_open_in_editor_file_path: {
        name: 'get_open_in_editor_file_path',
        description: '获取当前在编辑器中打开的文件的绝对路径。返回空字符串如果没有文件打开。',
        inputSchema: {
            type: 'object',
            properties: {}
        }
    },

    get_selected_in_editor_text: {
        name: 'get_selected_in_editor_text',
        description: '获取当前在编辑器中选择的文本。返回空字符串如果没有选择的文本或没有打开编辑器。',
        inputSchema: {
            type: 'object',
            properties: {}
        }
    },

    replace_selected_text: {
        name: 'replace_selected_text',
        description: '替换当前在编辑器中选择的文本。如果没有选择文本或没有打开编辑器，则返回错误。',
        inputSchema: {
            type: 'object',
            properties: {
                text: {type: 'string'}
            },
            required: ['text']
        }
    },

    replace_current_file_text: {
        name: 'replace_current_file_text',
        description: '替换当前在编辑器中打开的文件的全部内容。如果没有打开文件，则返回错误。',
        inputSchema: {
            type: 'object',
            properties: {
                text: {type: 'string'}
            },
            required: ['text']
        }
    },

    create_new_file_with_text: {
        name: 'create_new_file_with_text',
        description: '在项目目录中指定路径创建新文件并填充内容。如果无法确定项目目录，则返回错误。',
        inputSchema: {
            type: 'object',
            properties: {
                pathInProject: {type: 'string'},
                text: {type: 'string'}
            },
            required: ['pathInProject', 'text']
        }
    },

    find_files_by_name_substring: {
        name: 'find_files_by_name_substring',
        description: '在项目中搜索文件名包含指定子字符串的所有文件。返回文件信息数组。',
        inputSchema: {
            type: 'object',
            properties: {
                nameSubstring: {type: 'string'}
            },
            required: ['nameSubstring']
        }
    },

    get_file_text_by_path: {
        name: 'get_file_text_by_path',
        description: '通过相对于项目根目录的路径获取文件的文本内容。如果文件不存在或超出项目范围，则返回错误。',
        inputSchema: {
            type: 'object',
            properties: {
                pathInProject: {type: 'string'}
            },
            required: ['pathInProject']
        }
    },

    get_project_vcs_status: {
        name: 'get_project_vcs_status',
        description: '获取项目中文件的版本控制状态。返回变更文件的列表。',
        inputSchema: {
            type: 'object',
            properties: {}
        }
    },

    toggle_debugger_breakpoint: {
        name: 'toggle_debugger_breakpoint',
        description: '在指定项目文件的指定行切换调试器断点。如果无法确定项目目录，则返回错误。',
        inputSchema: {
            type: 'object',
            properties: {
                filePathInProject: {type: 'string'},
                line: {type: 'number'}
            },
            required: ['filePathInProject', 'line']
        }
    },

    get_debugger_breakpoints: {
        name: 'get_debugger_breakpoints',
        description: '获取项目中当前设置的所有行断点的列表。返回断点信息数组。',
        inputSchema: {
            type: 'object',
            properties: {}
        }
    },

    replace_file_text_by_path: {
        name: 'replace_file_text_by_path',
        description: '使用新文本替换指定项目文件的全部内容。如果文件不存在或无法访问，则返回错误。',
        inputSchema: {
            type: 'object',
            properties: {
                pathInProject: {type: 'string'},
                text: {type: 'string'}
            },
            required: ['pathInProject', 'text']
        }
    },

    list_files_in_folder: {
        name: 'list_files_in_folder',
        description: '列出指定项目文件夹中的所有文件和目录。返回条目信息数组。',
        inputSchema: {
            type: 'object',
            properties: {
                pathInProject: {type: 'string'}
            },
            required: ['pathInProject']
        }
    },

    search_in_files_content: {
        name: 'search_in_files_content',
        description: '在项目的所有文件中搜索指定的文本子字符串。返回包含匹配项的文件信息数组。',
        inputSchema: {
            type: 'object',
            properties: {
                searchText: {type: 'string'}
            },
            required: ['searchText']
        }
    },

    run_configuration: {
        name: 'run_configuration',
        description: '运行当前项目中的特定运行配置。如果找不到运行配置或执行失败，则返回错误。',
        inputSchema: {
            type: 'object',
            properties: {
                configName: {type: 'string'}
            },
            required: ['configName']
        }
    },

    get_run_configurations: {
        name: 'get_run_configurations',
        description: '获取当前项目中可用的运行配置列表。返回运行配置名称的数组。',
        inputSchema: {
            type: 'object',
            properties: {}
        }
    },

    get_project_modules: {
        name: 'get_project_modules',
        description: '获取项目中所有模块及其依赖项的列表。返回模块名称的数组。',
        inputSchema: {
            type: 'object',
            properties: {}
        }
    },

    get_project_dependencies: {
        name: 'get_project_dependencies',
        description: '获取项目中定义的所有依赖项的列表。返回依赖项名称的数组。',
        inputSchema: {
            type: 'object',
            properties: {}
        }
    },

    get_all_open_file_texts: {
        name: 'get_all_open_file_texts',
        description: '获取当前在IDE编辑器中打开的所有文件的文本内容。返回文件信息数组。',
        inputSchema: {
            type: 'object',
            properties: {}
        }
    },

    get_all_open_file_paths: {
        name: 'get_all_open_file_paths',
        description: '列出当前在IDE编辑器中打开的所有文件的相对路径。返回文件路径列表。',
        inputSchema: {
            type: 'object',
            properties: {}
        }
    },

    open_file_in_editor: {
        name: 'open_file_in_editor',
        description: '在IDE编辑器中打开指定文件。如果文件不存在或无法打开，则返回错误。',
        inputSchema: {
            type: 'object',
            properties: {
                filePath: {type: 'string'}
            },
            required: ['filePath']
        }
    },

    list_available_actions: {
        name: 'list_available_actions',
        description: '列出IDE编辑器中可用的所有操作。返回操作信息数组。',
        inputSchema: {
            type: 'object',
            properties: {}
        }
    },

    execute_action_by_id: {
        name: 'execute_action_by_id',
        description: '在IDE编辑器中通过ID执行操作。如果找不到指定ID的操作，则返回错误。',
        inputSchema: {
            type: 'object',
            properties: {
                actionId: {type: 'string'}
            },
            required: ['actionId']
        }
    },

    get_progress_indicators: {
        name: 'get_progress_indicators',
        description: '获取IDE编辑器中所有正在运行的进度指示器的状态。返回进度信息数组。',
        inputSchema: {
            type: 'object',
            properties: {}
        }
    },

    wait: {
        name: 'wait',
        description: '等待指定的毫秒数。默认值为5000毫秒（5秒）。在等待完成后返回"ok"。',
        inputSchema: {
            type: 'object',
            properties: {
                milliseconds: {type: 'number'}
            },
            required: ['milliseconds']
        }
    },

    get_terminal_text: {
        name: 'get_terminal_text',
        description: '从IDE中的第一个活动终端获取当前文本内容。如果没有打开终端，则返回空字符串。',
        inputSchema: {
            type: 'object',
            properties: {}
        }
    },

    execute_terminal_command: {
        name: 'execute_terminal_command',
        description: '在IDE的集成终端中执行指定的shell命令。返回终端输出或错误消息。',
        inputSchema: {
            type: 'object',
            properties: {
                command: {type: 'string'}
            },
            required: ['command']
        }
    },

    find_commit_by_message: {
        name: 'find_commit_by_message',
        description: '在项目历史记录中根据提供的文本或关键字搜索提交。返回匹配的提交哈希数组。',
        inputSchema: {
            type: 'object',
            properties: {
                text: {type: 'string'}
            },
            required: ['text']
        }
    },

    // 新增的Git高级工具
    get_file_history: {
        name: 'get_file_history',
        description: '获取指定文件的修改历史记录。返回包含提交哈希、作者、日期和消息的提交列表。',
        inputSchema: {
            type: 'object',
            properties: {
                pathInProject: {type: 'string'},
                maxCount: {type: 'number'}
            },
            required: ['pathInProject']
        }
    },

    get_file_diff: {
        name: 'get_file_diff',
        description: '获取文件的差异信息。可以比较两个提交之间、指定提交与工作区之间，或暂存区与工作区之间的差异。',
        inputSchema: {
            type: 'object',
            properties: {
                pathInProject: {type: 'string'},
                hash1: {type: 'string'},
                hash2: {type: 'string'}
            },
            required: ['pathInProject']
        }
    },

    get_branch_info: {
        name: 'get_branch_info',
        description: '获取当前分支信息和所有可用分支的列表。包括本地分支和远程分支。',
        inputSchema: {
            type: 'object',
            properties: {}
        }
    },

    get_commit_details: {
        name: 'get_commit_details',
        description: '获取特定提交的详细信息，包括作者、日期、提交消息和更改的文件列表。',
        inputSchema: {
            type: 'object',
            properties: {
                hash: {type: 'string'}
            },
            required: ['hash']
        }
    },

    commit_changes: {
        name: 'commit_changes',
        description: '提交当前的更改。如果指定amend为true，则修改上一次提交。自动将未暂存的更改添加到暂存区。',
        inputSchema: {
            type: 'object',
            properties: {
                message: {type: 'string'},
                amend: {type: 'boolean'}
            },
            required: ['message']
        }
    },

    pull_changes: {
        name: 'pull_changes',
        description: '从远程仓库拉取更改。可以指定远程仓库名称和分支名称。',
        inputSchema: {
            type: 'object',
            properties: {
                remote: {type: 'string'},
                branch: {type: 'string'}
            }
        }
    },

    switch_branch: {
        name: 'switch_branch',
        description: '切换到指定的分支。如果分支不存在，则返回错误。',
        inputSchema: {
            type: 'object',
            properties: {
                branch: {type: 'string'}
            },
            required: ['branch']
        }
    },

    create_branch: {
        name: 'create_branch',
        description: '创建新的分支并切换到该分支。可以指定起始点（提交哈希或分支名）。',
        inputSchema: {
            type: 'object',
            properties: {
                branch: {type: 'string'},
                startPoint: {type: 'string'}
            },
            required: ['branch']
        }
    },

    // 新增的代码分析工具
    get_symbols_in_file: {
        name: 'get_symbols_in_file',
        description: '获取文件中定义的所有符号（函数、类、变量等）。返回符号信息的结构化视图。',
        inputSchema: {
            type: 'object',
            properties: {
                pathInProject: {type: 'string'}
            },
            required: ['pathInProject']
        }
    },

    find_references: {
        name: 'find_references',
        description: '查找符号的所有引用位置。需要提供文件路径和符号位置（行号和字符位置）。',
        inputSchema: {
            type: 'object',
            properties: {
                pathInProject: {type: 'string'},
                line: {type: 'number'},
                character: {type: 'number'}
            },
            required: ['pathInProject', 'line', 'character']
        }
    },

    refactor_code_at_location: {
        name: 'refactor_code_at_location',
        description: '在特定位置执行代码重构。支持重命名、提取函数、提取变量等操作。需要指定重构类型和其他选项。',
        inputSchema: {
            type: 'object',
            properties: {
                pathInProject: {type: 'string'},
                line: {type: 'number'},
                character: {type: 'number'},
                refactorType: {type: 'string'},
                options: {
                    type: 'object',
                    properties: {
                        newName: {type: 'string'}
                    }
                }
            },
            required: ['pathInProject', 'line', 'character', 'refactorType']
        }
    }
};