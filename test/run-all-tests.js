const { findMCPServerPort, colors } = require('./utils');
const { testStatus } = require('./status');
const { testGetOpenInEditorFilePath } = require('./get_open_in_editor_file_path');
const { testGetOpenInEditorFileText } = require('./get_open_in_editor_file_text');
const { testGetSelectedInEditorText } = require('./get_selected_in_editor_text');
const { testGetAllOpenFilePaths } = require('./get_all_open_file_paths');
const { testListFilesInFolder } = require('./list_files_in_folder');
const { testListTools } = require('./list_tools');
const { testListAvailableActions } = require('./list_available_actions');
const { testFindFilesByNameSubstring } = require('./find_files_by_name_substring');
const { testSearchInFilesContent } = require('./search_in_files_content');
const { testGetFileTextByPath } = require('./get_file_text_by_path');
const { testReplaceFileTextByPath } = require('./replace_file_text_by_path');
const { testCreateNewFileWithText } = require('./create_new_file_with_text');

/**
 * 运行所有测试
 */
async function runAllTests() {
    try {
        console.log('==========================================');
        console.log('     开始测试VSCode MCP服务器API');
        console.log('==========================================');
        
        // 查找MCP服务器端口
        const port = await findMCPServerPort();
        console.log(`\n使用端口: ${port} 进行测试`);
        
        // 测试获取可用工具列表
        await testListTools(port);
        
        // 测试获取工作区状态（包含工作区路径）
        await testStatus(port);
        
        // 测试获取当前打开的文件路径
        await testGetOpenInEditorFilePath(port);
        
        // 测试获取当前打开的文件内容
        await testGetOpenInEditorFileText(port);
        
        // 测试获取选中的文本
        await testGetSelectedInEditorText(port);
        
        // 测试获取所有打开的文件路径
        await testGetAllOpenFilePaths(port);
        
        // 测试目录列表功能
        await testListFilesInFolder(port, "/");
        
        // 测试获取可用操作列表
        await testListAvailableActions(port);
        
        // 文件处理相关的测试
        console.log(colors.cyan + '\n=========== 开始测试文件处理相关API ===========');
        
        // 测试根据名称子字符串查找文件
        await testFindFilesByNameSubstring(port, "handler");
        
        // 测试在文件内容中搜索文本
        await testSearchInFilesContent(port, "import");
        
        // 测试通过路径获取文件内容
        await testGetFileTextByPath(port, "/package.json");
        
        // 创建一个临时文件用于测试
        const testFilePath = "/test/temp/test_file_" + Date.now() + ".txt";
        const testContent = "这是测试文件内容\n生成时间: " + new Date().toISOString();
        
        // 测试创建新文件并填充内容
        console.log(colors.cyan + '\n测试创建新文件:' + colors.reset);
        await testCreateNewFileWithText(port, testFilePath, testContent);
        
        // 测试通过路径替换文件内容
        console.log(colors.cyan + '\n测试替换文件内容:' + colors.reset);
        await testReplaceFileTextByPath(port, testFilePath, testContent + "\n\n内容已被替换!");
        
        // 再次测试通过路径获取文件内容
        console.log(colors.cyan + '\n测试获取更新后的文件内容:' + colors.reset);
        await testGetFileTextByPath(port, testFilePath);
        
        console.log('\n==========================================');
        console.log('     所有测试完成!');
        console.log('==========================================');
    } catch (error) {
        console.error(`\n测试过程中出错: ${error.message}`);
        process.exit(1);
    }
}

// 执行测试
runAllTests();