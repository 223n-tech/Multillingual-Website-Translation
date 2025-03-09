/**
 * 簡易YAMLパーサー (js-yamlライブラリの代わりに使用)
 * 注: このパーサーは非常に限定的な機能しか持ちません
 */

// グローバル名前空間に定義
window.jsyaml = (function() {
  
  // YAMLをJavaScriptオブジェクトに変換
  function load(yamlString) {
    if (!yamlString || typeof yamlString !== 'string') {
      throw new Error('YAMLの入力が無効です');
    }
    
    // コメントを削除
    yamlString = yamlString.replace(/#.*$/gm, '');
    
    const result = {};
    let currentArray = null;
    let currentArrayName = null;
    let currentIndent = 0;
    let inArrayItem = false;
    
    // 行ごとに処理
    const lines = yamlString.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLine = line.trim();
      
      // 空行はスキップ
      if (!trimmedLine) continue;
      
      // インデントを計算
      const indent = line.search(/\S/);
      
      // キー・値のペアを解析
      if (trimmedLine.includes(':')) {
        const colonIndex = trimmedLine.indexOf(':');
        const key = trimmedLine.substring(0, colonIndex).trim();
        let value = trimmedLine.substring(colonIndex + 1).trim();
        
        // 値が引用符で囲まれている場合は引用符を削除
        if ((value.startsWith('"') && value.endsWith('"')) || 
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.substring(1, value.length - 1);
        }
        
        // 配列の開始を検出
        if (value === '' && lines[i+1] && lines[i+1].trim().startsWith('-')) {
          currentArrayName = key;
          currentArray = [];
          result[key] = currentArray;
          currentIndent = indent;
          continue;
        }
        
        // 通常のキー・値ペア
        if (value) {
          // 数値への変換を試みる
          if (/^-?\d+(\.\d+)?$/.test(value)) {
            if (value.includes('.')) {
              value = parseFloat(value);
            } else {
              value = parseInt(value, 10);
            }
          }
          // ブール値への変換
          else if (value.toLowerCase() === 'true') {
            value = true;
          }
          else if (value.toLowerCase() === 'false') {
            value = false;
          }
          
          // 値を設定
          if (inArrayItem && currentArray && indent > currentIndent) {
            // 配列アイテムの入れ子プロパティ
            if (!currentArray[currentArray.length - 1]) {
              currentArray[currentArray.length - 1] = {};
            }
            currentArray[currentArray.length - 1][key] = value;
          } else {
            result[key] = value;
            inArrayItem = false;
          }
        }
      }
      // 配列アイテムを解析
      else if (trimmedLine.startsWith('-')) {
        inArrayItem = true;
        const value = trimmedLine.substring(1).trim();
        
        // 配列が初期化されていない場合
        if (!currentArray) {
          currentArray = [];
          currentArrayName = 'items'; // デフォルト名
          result[currentArrayName] = currentArray;
        }
        
        // 値が空でない場合（オブジェクトではない場合）
        if (value) {
          currentArray.push(value);
        } else {
          // 次の行からオブジェクトが開始される
          currentArray.push({});
        }
      }
    }
    
    return result;
  }
  
  // JavaScriptオブジェクトをYAML文字列に変換
  function dump(obj) {
    if (!obj || typeof obj !== 'object') {
      throw new Error('無効なオブジェクトです');
    }
    
    // 再帰的にオブジェクトをYAML文字列に変換
    function dumpValue(value, indent = 0) {
      const spaces = ' '.repeat(indent);
      
      if (value === null || value === undefined) {
        return spaces + 'null';
      }
      else if (typeof value === 'string') {
        // 特殊文字を含む場合は引用符で囲む
        if (/[:#\[\]{}"']/g.test(value) || value === '') {
          return spaces + `"${value.replace(/"/g, '\\"')}"`;
        }
        return spaces + value;
      }
      else if (typeof value === 'number' || typeof value === 'boolean') {
        return spaces + value.toString();
      }
      else if (Array.isArray(value)) {
        let result = '';
        for (const item of value) {
          if (typeof item === 'object' && !Array.isArray(item)) {
            result += spaces + '-\n';
            for (const [k, v] of Object.entries(item)) {
              result += spaces + '  ' + k + ': ' + dumpValue(v, 0).trimStart() + '\n';
            }
          } else {
            result += spaces + '- ' + dumpValue(item, 0).trimStart() + '\n';
          }
        }
        return result;
      }
      else if (typeof value === 'object') {
        let result = '';
        for (const [k, v] of Object.entries(value)) {
          if (Array.isArray(v)) {
            result += spaces + k + ':\n' + dumpValue(v, indent + 2);
          } else if (typeof v === 'object' && v !== null) {
            result += spaces + k + ':\n';
            for (const [nestedK, nestedV] of Object.entries(v)) {
              result += spaces + '  ' + nestedK + ': ' + dumpValue(nestedV, 0).trimStart() + '\n';
            }
          } else {
            result += spaces + k + ': ' + dumpValue(v, 0).trimStart() + '\n';
          }
        }
        return result;
      }
      
      return spaces + String(value);
    }
    
    return dumpValue(obj);
  }
  
  return {
    load,
    dump
  };
})();

// デバッグメッセージ
console.log('[翻訳拡張] simple-yaml.js 読み込み完了');
