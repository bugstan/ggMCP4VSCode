/**
 * Tool List Definition
 * Defines all available VSCode API tools
 */
export const tools = {
    get_open_in_editor_file_text: {
        name: 'get_open_in_editor_file_text',
        description: 'Retrieve the complete text content of the file currently open in the editor. Returns an empty string if no file is open.',
        inputSchema: {
            type: 'object',
            properties: {}
        }
    },

    get_open_in_editor_file_path: {
        name: 'get_open_in_editor_file_path',
        description: 'Get the absolute path of the file currently open in the editor. Returns an empty string if no file is open.',
        inputSchema: {
            type: 'object',
            properties: {}
        }
    },

    get_selected_in_editor_text: {
        name: 'get_selected_in_editor_text',
        description: 'Get the text currently selected in the editor. Returns an empty string if no text is selected or no editor is open.',
        inputSchema: {
            type: 'object',
            properties: {}
        }
    },

    replace_selected_text: {
        name: 'replace_selected_text',
        description: 'Replace the text currently selected in the editor. Returns an error if no text is selected or no editor is open.',
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
        description: 'Replace the entire content of the file currently open in the editor. Returns an error if no file is open.',
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
        description: 'Create a new file at the specified path in the project directory and fill with content. Returns an error if the project directory cannot be determined.',
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
        description: 'Search for all files in the project whose names contain the specified substring. Returns an array of file information.',
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
        description: 'Get the text content of a file using its path relative to the project root. Returns an error if the file does not exist or is outside the project scope.',
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
        description: 'Get the version control status of files in the project. Returns a list of changed files.',
        inputSchema: {
            type: 'object',
            properties: {}
        }
    },

    toggle_debugger_breakpoint: {
        name: 'toggle_debugger_breakpoint',
        description: 'Toggle a debugger breakpoint at the specified line in a project file. Returns an error if the project directory cannot be determined.',
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
        description: 'Get a list of all line breakpoints currently set in the project. Returns an array of breakpoint information.',
        inputSchema: {
            type: 'object',
            properties: {}
        }
    },

    replace_file_text_by_path: {
        name: 'replace_file_text_by_path',
        description: 'Replace the entire content of a specified project file with new text. Returns an error if the file does not exist or cannot be accessed.',
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
        description: 'List all files and directories in the specified project folder. Returns an array of entry information.',
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
        description: 'Search for a specified text substring within all files in the project. Returns an array of file information containing matches.',
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
        description: 'Run a specific run configuration in the current project. Returns an error if the run configuration is not found or fails to execute.',
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
        description: 'Get a list of available run configurations in the current project. Returns an array of run configuration names.',
        inputSchema: {
            type: 'object',
            properties: {}
        }
    },

    get_project_modules: {
        name: 'get_project_modules',
        description: 'Get a list of all modules and their dependencies in the project. Returns an array of module names.',
        inputSchema: {
            type: 'object',
            properties: {}
        }
    },

    get_project_dependencies: {
        name: 'get_project_dependencies',
        description: 'Get a list of all dependencies defined in the project. Returns an array of dependency names.',
        inputSchema: {
            type: 'object',
            properties: {}
        }
    },

    get_all_open_file_texts: {
        name: 'get_all_open_file_texts',
        description: 'Get the text content of all files currently open in the IDE editor. Returns an array of file information.',
        inputSchema: {
            type: 'object',
            properties: {}
        }
    },

    get_all_open_file_paths: {
        name: 'get_all_open_file_paths',
        description: 'List the relative paths of all files currently open in the IDE editor. Returns a list of file paths.',
        inputSchema: {
            type: 'object',
            properties: {}
        }
    },

    open_file_in_editor: {
        name: 'open_file_in_editor',
        description: 'Open the specified file in the IDE editor. Returns an error if the file does not exist or cannot be opened.',
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
        description: 'List all actions available in the IDE editor. Returns an array of action information.',
        inputSchema: {
            type: 'object',
            properties: {}
        }
    },

    execute_action_by_id: {
        name: 'execute_action_by_id',
        description: 'Execute an action in the IDE editor by its ID. Returns an error if the action with the specified ID is not found.',
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
        description: 'Get the status of all progress indicators currently running in the IDE editor. Returns an array of progress information.',
        inputSchema: {
            type: 'object',
            properties: {}
        }
    },

    wait: {
        name: 'wait',
        description: 'Wait for the specified number of milliseconds. Default is 5000 milliseconds (5 seconds). Returns "ok" after waiting completes.',
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
        description: 'Get the current text content from the first active terminal in the IDE. Returns an empty string if no terminal is open.',
        inputSchema: {
            type: 'object',
            properties: {}
        }
    },

    execute_terminal_command: {
        name: 'execute_terminal_command',
        description: 'Execute a specified shell command in the IDE\'s integrated terminal. Returns terminal output or error messages.',
        inputSchema: {
            type: 'object',
            properties: {
                command: {type: 'string'}
            },
            required: ['command']
        }
    },
    
    // New methods to execute command and get output
    execute_command_with_output: {
        name: 'execute_command_with_output',
        description: 'Execute a command and store the output in a dedicated output channel. The output can be retrieved later with get_command_output.',
        inputSchema: {
            type: 'object',
            properties: {
                command: {type: 'string'}
            },
            required: ['command']
        }
    },
    
    get_command_output: {
        name: 'get_command_output',
        description: 'Get the output of the last command executed with execute_command_with_output. Returns the command status and output text.',
        inputSchema: {
            type: 'object',
            properties: {}
        }
    },

    find_commit_by_message: {
        name: 'find_commit_by_message',
        description: 'Search for commits in the project history based on the provided text or keywords. Returns an array of matching commit hashes.',
        inputSchema: {
            type: 'object',
            properties: {
                text: {type: 'string'}
            },
            required: ['text']
        }
    },

    // New Git advanced tools
    get_file_history: {
        name: 'get_file_history',
        description: 'Get the modification history of a specified file. Returns a list of commits with their hash, author, date, and message.',
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
        description: 'Get the diff information for a file. Can compare differences between two commits, between a specific commit and the working area, or between the staging area and working area.',
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
        description: 'Get current branch information and a list of all available branches. Includes local and remote branches.',
        inputSchema: {
            type: 'object',
            properties: {}
        }
    },

    get_commit_details: {
        name: 'get_commit_details',
        description: 'Get detailed information for a specific commit, including author, date, commit message, and list of changed files.',
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
        description: 'Commit current changes. If amend is set to true, modify the last commit. Automatically stages unstaged changes.',
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
        description: 'Pull changes from the remote repository. Can specify remote repository name and branch name.',
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
        description: 'Switch to the specified branch. Returns an error if the branch does not exist.',
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
        description: 'Create a new branch and switch to it. Can specify a starting point (commit hash or branch name).',
        inputSchema: {
            type: 'object',
            properties: {
                branch: {type: 'string'},
                startPoint: {type: 'string'}
            },
            required: ['branch']
        }
    },

    // New code analysis tools
    get_symbols_in_file: {
        name: 'get_symbols_in_file',
        description: 'Get all symbols (functions, classes, variables, etc.) defined in a file. Returns a structured view of symbol information.',
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
        description: 'Find all reference locations for a symbol. Requires file path and symbol position (line number and character position).',
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
        description: 'Perform code refactoring at a specific location. Supports operations like renaming, extract function, extract variable, etc. Requires specifying refactoring type and other options.',
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