/**
 * 准备测试环境
 * 这个脚本创建测试所需的目录和文件
 */

const fs = require('fs');
const path = require('path');

// 创建测试目录
const testDirPath = path.join(__dirname, 'tests');
const testDataDirPath = path.join(testDirPath, 'testdata');

// 确保tests目录存在
if (!fs.existsSync(testDirPath)) {
    fs.mkdirSync(testDirPath, { recursive: true });
    console.log(`创建目录: ${testDirPath}`);
}

// 确保testdata目录存在
if (!fs.existsSync(testDataDirPath)) {
    fs.mkdirSync(testDataDirPath, { recursive: true });
    console.log(`创建目录: ${testDataDirPath}`);
}

// 创建测试文件
const testFilePath = path.join(testDataDirPath, 'sample.txt');
fs.writeFileSync(testFilePath, 'This is a test file for integration testing.', 'utf8');
console.log(`创建测试文件: ${testFilePath}`);

// 创建测试目录下的子目录
const testSubDirPath = path.join(testDataDirPath, 'subdir');
if (!fs.existsSync(testSubDirPath)) {
    fs.mkdirSync(testSubDirPath, { recursive: true });
    console.log(`创建子目录: ${testSubDirPath}`);
}

// 创建子目录中的测试文件
const testSubFilePath = path.join(testSubDirPath, 'subfile.txt');
fs.writeFileSync(testSubFilePath, 'This is a test file in the subdirectory.', 'utf8');
console.log(`创建子目录测试文件: ${testSubFilePath}`);

// 创建具有不同平台路径格式的测试文件
if (process.platform === 'win32') {
    // Windows平台特定测试
    const winStylePath = path.join(testDataDirPath, 'win-style.txt');
    fs.writeFileSync(winStylePath, 'This file uses Windows style path.', 'utf8');
    console.log(`创建Windows风格路径文件: ${winStylePath}`);
} else {
    // Unix平台特定测试
    const unixStylePath = path.join(testDataDirPath, 'unix-style.txt');
    fs.writeFileSync(unixStylePath, 'This file uses Unix style path.', 'utf8');
    console.log(`创建Unix风格路径文件: ${unixStylePath}`);
}

console.log('测试环境准备完成!');
