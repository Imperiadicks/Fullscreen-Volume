# Fullscreen Volume

Web-addon для PulseSync. Добавляет ползунок громкости под полосой прогресса в полноэкранном плеере Яндекс Музыки. Колесо меняет громкость на 5 процентных пунктов, кнопка выключает звук и восстанавливает предыдущий уровень.

![ползунок в FullPlayer](https://github.com/Imperiadicks/Fullscreen-Volume/blob/main/image.png)
В аддоне используются материалы PulseSync, лицензированные по PulseSync Addon Development License 1.1.

## Сборка

Требуются Node.js и Yarn версии из `package.json`.

```sh
yarn install
yarn build
```

Готовый аддон появится в `dist/fullscreen-volume`. Команда `yarn sync` устанавливает собранный аддон в PulseSync. Для сборки и синхронизации при изменениях есть `yarn dev`.

Шаблон и инструменты сборки PulseSync распространяются по [PulseSync Addon Development License 1.1](LICENSE.PulseSync). [Русская версия](LICENSE.ru.md).
