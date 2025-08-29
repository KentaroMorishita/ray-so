import classNames from "classnames";
import React, { useEffect, useState } from "react";
import { Language, LANGUAGES } from "../util/languages";

import styles from "./Editor.module.css";
import { highlightedLinesAtom, highlighterAtom, loadingLanguageAtom } from "../store";
import { useAtomValue, useSetAtom } from "jotai";
import { darkModeAtom, themeAtom } from "../store/themes";

type PropTypes = {
  selectedLanguage: Language | null;
  code: string;
};

const HighlightedCode: React.FC<PropTypes> = ({ selectedLanguage, code }) => {
  const [highlightedHtml, setHighlightedHtml] = useState("");
  const highlighter = useAtomValue(highlighterAtom);
  const setIsLoadingLanguage = useSetAtom(loadingLanguageAtom);
  const highlightedLines = useAtomValue(highlightedLinesAtom);
  const darkMode = useAtomValue(darkModeAtom);
  const theme = useAtomValue(themeAtom);
  const themeName = theme.id === "tailwind" ? (darkMode ? "tailwind-dark" : "tailwind-light") : "css-variables";

  useEffect(() => {
    const generateHighlightedHtml = async () => {
      // プレーンテキスト or ハイライター未用意のときは素直にエスケープだけ
      if (!highlighter || !selectedLanguage || selectedLanguage === LANGUAGES.plaintext) {
        return code.replace(/[\u00A0-\u9999<>\&]/g, (i) => `&#${i.charCodeAt(0)};`);
      }

      // 言語定義を解決（builtinは配列、カスタムも配列で合わせる）
      const mod = await selectedLanguage.src();
      const regs = (mod?.default ?? mod) as any;
      const arr: any[] = Array.isArray(regs) ? regs : [regs];

      // 末尾がメイン言語（前方に依存言語が入ることがある）
      const main = arr[arr.length - 1];
      const langName: string = String(main?.name ?? selectedLanguage.name); // 小文字化しない

      // 未ロードなら配列ごとロード（Shiki v1は配列で渡すのが安定）
      const loaded: string[] = highlighter.getLoadedLanguages?.() ?? [];
      if (!loaded.includes(langName)) {
        setIsLoadingLanguage(true);
        await highlighter.loadLanguage(arr);
        setIsLoadingLanguage(false);
      }

      // Typescriptは見た目合わせ（不要なら削ってOK）
      const langForRender = langName === "typescript" ? "tsx" : langName;

      return highlighter.codeToHtml(code, {
        lang: langForRender,
        theme: themeName,
        transformers: [
          {
            line(node, line) {
              node.properties["data-line"] = line;
              if (highlightedLines.includes(line)) {
                // @ts-ignore - shiki transformer helper
                this.addClassToHast(node, "highlighted-line");
              }
            },
          },
        ],
      });
    };

    generateHighlightedHtml().then((newHtml) => {
      setHighlightedHtml(newHtml);
    });
  }, [code, selectedLanguage, highlighter, setIsLoadingLanguage, highlightedLines, themeName]);

  return (
    <div
      className={classNames(styles.formatted, selectedLanguage === LANGUAGES.plaintext && styles.plainText)}
      dangerouslySetInnerHTML={{ __html: highlightedHtml }}
    />
  );
};

export default HighlightedCode;
