### バグの概要と原因

- **現象**: リポジトリカードを「表示/非表示」切り替え時に、各カラムの件数バッジや合計表示の数字が一瞬"震える（レイアウトが小刻みにズレる）"。
- **主因**: 数字がプロポーショナル（可変幅）で描画されており、カウントの増減で桁の字幅が変わり、周囲のレイアウトが再フロー → 視覚的な揺れ（レイアウトシフト）が発生。
- **併発要因**: 一部要素でのトランジションが、幅変動の視覚差をやや増幅して見せていた可能性（ただし、直接数字を含む要素では無効化不要でした）。

### 対応方針

- 数値にタブラー（等幅）数字を適用し、カウントの増減でも字幅が一定になるようにする。
- 件数バッジには最小幅も与えて、1桁→2桁の変化でも揺れを抑える。

### 変更点

1. **RepoColumn（カラムの件数バッジ）**
   - **変更ファイル**: `src/components/RepoColumn.tsx`
   - **変更内容**:
     - バッジに `tabular-nums` を付与
     - さらに `min-w-[2ch] text-center` を追加し、1〜2桁の幅を安定化
   - **該当箇所**:
     ```tsx
     <span className={`px-2 py-1 rounded text-sm border ${colors.border} ${colors.badgeBg} ${colors.badgeText} tabular-nums min-w-[2ch] text-center`}>
       {repos.length}
     </span>
     ```

2. **TopBar（合計表示や非表示カウントなど）**
   - **変更ファイル**: `src/components/TopBar.tsx`
   - **変更内容**:
     - 合計表示の行に `tabular-nums` を付与
     ```tsx
     <div className="mt-3 text-sm text-[var(--text-muted)] tabular-nums">
       合計 {totalRepos} 件中 {filteredCount} 件を表示
       ...
     </div>
     ```
     - プリセット保存ダイアログ内の「非表示リポジトリ: n件」に `tabular-nums` を付与
     ```tsx
     <div className="text-sm text-[var(--text-secondary)] tabular-nums">
       <strong>非表示リポジトリ:</strong> {hiddenRepos.length}件
     </div>
     ```
     - 「非表示のリポジトリ (n)」ダイアログ見出しにも `tabular-nums` を付与
     ```tsx
     <h2 className="text-xl font-bold text-[var(--text-primary)] tabular-nums">
       非表示のリポジトリ ({hiddenRepos.length})
     </h2>
     ```

### 期待される効果

- 件数が増減しても数字の幅が一定になり、レイアウトシフト（"震え"）が解消されます。
- バッジに最小幅を持たせたため、1桁→2桁の境目でも安定します。

### 補足

- Tailwind CSS の `tabular-nums` は `font-variant-numeric: tabular-nums;` を適用するユーティリティで、既存の設定でそのまま使用できます。
- もし今後、他の数値（例: スター数など）で同様の揺れが発生したら、同じく `tabular-nums` をその数値の親要素に付与してください。

### ご確認ポイント

- 実機で「非表示 → 表示」あるいはカードの×ボタンで「表示 → 非表示」を繰り返し、
  - カラム右側の件数バッジ
  - TopBar の「合計 X 件中 Y 件を表示」
  - 非表示系ダイアログ内の数字
    以上の数字が揺れないことをご確認ください。
- もし他の場所でまだ揺れが残っていれば、画面名と対象の数字テキストを教えてください。すぐ同様の対処を適用します。
