import Link from "next/link";

import { CATALOG_PROVENANCE } from "@/data/catalog";
import { SOURCES } from "@/data/sources";
import { PageHeader } from "@/components/page-header";
import { CONFIDENCE_LABEL } from "@/lib/confidence";
import { formatDateRu } from "@/lib/date";

/**
 * Where the numbers come from, and how they are computed.
 *
 * A product that tells a teenager when a route closes owes them the ability to
 * check it. Nothing here depends on who is looking, so the page describes the
 * method and the data and nothing about the applicant.
 */
export function SourcesScreen() {
  return (
    <>
      <PageHeader
        title="Источники и методика"
        lede="Что мы считаем, чего не считаем и насколько проверена каждая дата. Ни одно число здесь не написано вручную — всё пересчитывается из каталога."
        back={{ href: "/doors", label: "К путям" }}
      />

      <div className="grid items-start gap-x-8 gap-y-6 lg:grid-cols-2">
      <section className="border-t border-border pt-4">
        <h2 className="text-sm font-medium">Как считается маршрут</h2>
        <ol className="mt-3 space-y-2 text-sm leading-relaxed">
          <li>
            1. Сначала проверяем, подходит ли путь под твои ограничения — язык обучения,
            финансирование, переезд, потолок стоимости.
          </li>
          <li>
            2. Затем строим цепочку обязательных действий назад от дедлайна подачи: экзамен нужно
            сдать до заявки, а зарегистрироваться на него — до экзамена.
          </li>
          <li>
            3. После этого определяем последний день, когда путь ещё физически достижим, — точку
            невозврата.
          </li>
        </ol>
        <p className="mt-3 text-sm leading-relaxed">
          Мы не рассчитываем вероятность поступления. Такого числа в продукте нет: никакая модель не
          знает, кто подаст документы в этом году вместе с тобой.
        </p>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Соответствие профилю — это совпадение с твоими же условиями. Оно нужно для сортировки и
          объяснения, а не для оценки шансов.
        </p>
      </section>

      <section className="border-t border-border pt-4">
        <h2 className="text-sm font-medium">Как дата попадает в каталог</h2>
        <p className="mt-3 text-sm leading-relaxed">
          Вузы публикуют сроки предложением, а не датой: «Early Action — 1 ноября (решение в
          середине декабря), Regular Action — 4 января». Разбор такого текста — единственное место,
          где мы можем ошибиться, поэтому он устроен по трём правилам.
        </p>
        <ol className="mt-3 space-y-2 text-sm leading-relaxed text-muted-foreground">
          <li>
            1. Считается только дата подачи. Дата решения, экзамена, взноса или языкового теста —
            не срок закрытия пути, хотя в тексте она обычно стоит позже.
          </li>
          <li>
            2. Путь закрывается на последнем раунде подачи. Ранний раунд — это возможность, а
            продукт отвечает на вопрос, когда возможности не станет.
          </li>
          <li>
            3. Год берётся из текста. Если его там нет, он выводится по циклу поступления — и тогда
            дата помечается как выведенная, потому что год наш, а не вуза.
          </li>
        </ol>
        <p className="mt-3 text-sm leading-relaxed">
          Если срок подачи прочитать нельзя — а несколько вузов прямо пишут, что даты различаются по
          программам, — путь остаётся без даты. Экран показывает формулировку вуза и ссылку, но не
          подставляет догадку.
        </p>
      </section>

      <section className="border-t border-border pt-4">
        <h2 className="text-sm font-medium">
          Уровни доверия к данным: {CATALOG_PROVENANCE.total} путей
        </h2>
        <dl className="mt-3 space-y-3 text-sm">
          <div>
            <dt className="font-medium">
              {CONFIDENCE_LABEL.verified} — {CATALOG_PROVENANCE.verified}
            </dt>
            <dd className="text-muted-foreground">
              Вуз назвал дату целиком, вместе с годом. Мы её только перенесли.
            </dd>
          </div>
          <div>
            <dt className="font-medium">
              {CONFIDENCE_LABEL.derived} — {CATALOG_PROVENANCE.derived}
            </dt>
            <dd className="text-muted-foreground">
              День и месяц — из источника, год выведен по циклу поступления: осенние сроки относятся
              к году до набора, зимние и весенние — к году набора.
            </dd>
          </div>
          <div>
            <dt className="font-medium">
              {CONFIDENCE_LABEL.last_cycle} — {CATALOG_PROVENANCE.last_cycle}
            </dt>
            <dd className="text-muted-foreground">
              Вуз опубликовал календарь прошлого цикла и пока не объявил новый. Даты настоящие, год
              устарел — планировать по ним можно, подавать по ним нельзя.
            </dd>
          </div>
          <div>
            <dt className="font-medium">Без даты — {CATALOG_PROVENANCE.undated}</dt>
            <dd className="text-muted-foreground">
              Срок подачи прочитать не удалось. Такой путь честно помечен как «нельзя рассчитать» и
              не получает выдуманной точки невозврата.
            </dd>
          </div>
        </dl>
      </section>

      </div>

      <section className="mt-6">
        <h2 className="mb-2 text-sm font-medium">Источники: {SOURCES.length}</h2>
        <ul className="grid gap-x-8 gap-y-4 md:grid-cols-2 xl:grid-cols-3">
          {SOURCES.map((source) => (
            <li key={source.id} className="border-t border-border pt-3">
              <h3 className="text-sm font-medium leading-snug">{source.title}</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">{source.publisher}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {CONFIDENCE_LABEL[source.confidence]}
                {source.accessed_at !== undefined &&
                  `, проверено ${formatDateRu(source.accessed_at)}`}
              </p>
              {source.url !== undefined ? (
                <a
                  href={source.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="mt-1 inline-block text-xs underline underline-offset-2"
                >
                  Открыть источник
                </a>
              ) : (
                <p className="mt-1 text-xs text-muted-foreground">
                  Ссылки нет: запись ещё никто не сверял, и придумывать адрес мы не станем.
                </p>
              )}
              {source.note !== undefined && (
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{source.note}</p>
              )}
            </li>
          ))}
        </ul>
      </section>

      <p className="mt-6 text-xs text-muted-foreground">
        Профиль и прогресс хранятся только в твоём браузере.{" "}
        <Link href="/doors" className="underline underline-offset-2">
          Вернуться к путям
        </Link>
      </p>
    </>
  );
}
