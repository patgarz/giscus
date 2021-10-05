import { readFileSync } from 'fs';
import { join } from 'path';
import Script from 'next/script';
import { ComponentProps, useContext, useEffect, useState } from 'react';
import Comment from '../components/Comment';
import { Reactions } from '../lib/reactions';
import { IComment, IReactionGroups } from '../lib/types/adapter';
import { renderMarkdown } from '../services/github/markdown';
import { getAppAccessToken } from '../services/github/getAppAccessToken';
import { useDebounce } from '../lib/hooks';
import Configuration from '../components/Configuration';
import { ThemeContext } from '../lib/context';
import { sendData } from '../lib/messages';
import { ISetConfigMessage } from '../lib/types/giscus';
import { getThemeUrl } from '../lib/utils';
import { GISCUS_APP_HOST } from '../services/config';
import { InferGetStaticPropsType } from 'next';

export async function getStaticProps() {
  const path = join(process.cwd(), 'README.md');
  const readme = readFileSync(path, 'utf-8');
  const contents = readme.split('<!-- configuration -->');
  const [afterConfig] = contents[1].split('<!-- end -->');
  contents[1] = `${afterConfig}\n## try it out 👇👇👇\n`;

  const token = await getAppAccessToken('patgarz/giscus').catch(() => '');
  const [contentBefore, contentAfter] = await Promise.all(
    contents.map(async (section) => await renderMarkdown(section, token, 'patgarz/giscus')),
  );

  const comment: IComment = {
    author: {
      avatarUrl: 'https://avatars.githubusercontent.com/in/106117',
      login: 'giscus',
      url: 'https://github.com/apps/giscus-pgarz-com',
    },
    authorAssociation: 'app',
    bodyHTML: contentBefore,
    createdAt: '2021-05-15T13:21:14Z',
    deletedAt: null,
    id: 'onboarding',
    isMinimized: false,
    lastEditedAt: null,
    reactions: Object.keys(Reactions).reduce((prev, key) => {
      prev[key] = { count: 0, viewerHasReacted: false };
      return prev;
    }, {}) as IReactionGroups,
    replies: [],
    replyCount: 0,
    upvoteCount: 0,
    url: 'https://github.com/patgarz/giscus',
    viewerDidAuthor: false,
    viewerHasUpvoted: false,
    viewerCanUpvote: false,
  };

  return {
    props: {
      comment,
      contentAfter,
    },
  };
}

type DirectConfig = ComponentProps<typeof Configuration>['directConfig'];
type DirectConfigHandler = ComponentProps<typeof Configuration>['onDirectConfigChange'];

export default function Home({
  comment,
  contentAfter,
}: InferGetStaticPropsType<typeof getStaticProps>) {
  const { theme, setTheme } = useContext(ThemeContext);
  const [directConfig, setDirectConfig] = useState<DirectConfig>({
    theme: 'light',
    themeUrl: `${GISCUS_APP_HOST}/themes/custom_example.css`,
    reactionsEnabled: true,
    emitMetadata: false,
  });
  const themeUrl = useDebounce(directConfig.themeUrl);
  const configTheme = getThemeUrl(directConfig.theme, themeUrl);

  const handleDirectConfigChange: DirectConfigHandler = (key, value) =>
    setDirectConfig({ ...directConfig, [key]: value });

  useEffect(() => {
    setTheme(configTheme);
  }, [setTheme, configTheme]);

  useEffect(() => {
    const data: ISetConfigMessage = {
      setConfig: {
        theme: configTheme,
        reactionsEnabled: directConfig.reactionsEnabled,
        emitMetadata: directConfig.emitMetadata,
      },
    };
    sendData(data, location.origin);
  }, [directConfig.emitMetadata, directConfig.reactionsEnabled, configTheme, themeUrl]);

  return (
    <main className="w-full min-h-screen gsc-homepage-bg" data-theme={theme}>
      <div className="w-full max-w-3xl p-2 mx-auto color-text-primary">
        <Comment comment={comment}>
          <Configuration
            directConfig={directConfig}
            onDirectConfigChange={handleDirectConfigChange}
          />
          <div className="p-4 pt-0 markdown" dangerouslySetInnerHTML={{ __html: contentAfter }} />
        </Comment>

        <div className="w-full my-8 giscus" />
        <Script
          src="/client.js"
          data-repo="patgarz/giscus"
          data-repo-id="R_kgDOGKepkQ"
          data-category-id="DIC_kwDOGKepkc4B_TM_"
          data-mapping="specific"
          data-term="Welcome to giscus!"
          data-theme="light"
          data-reactions-enabled="1"
          data-emit-metadata="0"
        />
      </div>
    </main>
  );
}
