import { GetStaticPaths, GetStaticProps } from 'next';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Link from 'next/link';

import Prismic from '@prismicio/client';
import { RichText } from 'prismic-dom';

import { format, compareAsc } from 'date-fns';
import ptBR from 'date-fns/locale/pt-BR';

import { FiCalendar, FiUser, FiClock } from 'react-icons/fi';

import Header from '../../components/Header';
import { Comments } from '../../components/Comments';
import { PreviewButton } from '../../components/PreviewButton';

import { getPrismicClient } from '../../services/prismic';

import commonStyles from '../../styles/common.module.scss';
import styles from './post.module.scss';

interface Post {
  first_publication_date: string | null;
  last_publication_date: string | null;
  uid: string;
  data: {
    title: string;
    banner: {
      url: string;
    };
    author: string;
    content: {
      heading: string;
      body: {
        text: string;
      }[];
    }[];
  };
}

interface PostProps {
  post: Post;
  nextPost: Post | null;
  prevPost: Post | null;
  wasEdited: boolean;
  preview: boolean;
}

export default function Post({
  post,
  prevPost,
  nextPost,
  wasEdited,
  preview,
}: PostProps): JSX.Element {
  const { isFallback } = useRouter();

  if (isFallback) {
    return <p>Carregando...</p>;
  }

  const formattedPublicationDate = format(
    new Date(post.first_publication_date),
    'dd MMM yyyy',
    {
      locale: ptBR,
    }
  );

  const wordsCount = post.data.content.reduce((accumulator, content) => {
    const wordsArray = RichText.asText(content.body).trim().split(/\s+/);
    return accumulator + wordsArray.length;
  }, 0);

  const readingTime = Math.ceil(wordsCount / 200);

  return (
    <>
      <Head>
        <title>{post.data.title} | Spacetraveling</title>
      </Head>

      <Header />

      <article className={styles.post}>
        <header className={styles.postHeader}>
          <img
            className={styles.postBanner}
            src={post.data.banner.url}
            alt={post.data.title}
          />
          <div className={commonStyles.container}>
            <h1 className={styles.postTitle}>{post.data.title}</h1>
            <div className={styles.postInfoContainer}>
              <time className={styles.postInfo}>
                <FiCalendar size={20} /> {formattedPublicationDate}
              </time>
              <div className={styles.postInfo}>
                <FiUser size={20} /> {post.data.author}
              </div>
              <div className={styles.postInfo}>
                <FiClock size={20} /> {readingTime} min
              </div>
            </div>
            {wasEdited && (
              <time className={styles.editedInfo}>
                {format(
                  new Date(post.last_publication_date),
                  "'* editado em' dd MMM yyyy, '??s' HH:mm",
                  {
                    locale: ptBR,
                  }
                )}
              </time>
            )}
          </div>
        </header>
        {post.data.content.map(content => (
          <section className={styles.postContent} key={content.heading}>
            <div className={commonStyles.container}>
              <h1 className={styles.postContentTitle}>{content.heading}</h1>
              <div
                className={styles.postContentText}
                // eslint-disable-next-line react/no-danger
                dangerouslySetInnerHTML={{
                  __html: RichText.asHtml(content.body),
                }}
              />
            </div>
          </section>
        ))}
      </article>

      <footer className={styles.pageFooter}>
        <div className={commonStyles.container}>
          <hr />

          <div className={styles.postNavigationContainer}>
            {prevPost && (
              <Link href={`/post/${prevPost.uid}`}>
                <a>
                  {prevPost.data.title}
                  <span>Post anterior</span>
                </a>
              </Link>
            )}
            {nextPost && (
              <Link href={`/post/${nextPost.uid}`}>
                <a>
                  {nextPost.data.title}
                  <span>Pr??ximo post</span>
                </a>
              </Link>
            )}
          </div>

          <Comments />

          {preview && <PreviewButton />}
        </div>
      </footer>
    </>
  );
}

export const getStaticPaths: GetStaticPaths = async () => {
  const prismic = getPrismicClient();
  const postsResponse = await prismic.query(
    [Prismic.Predicates.at('document.type', 'posts')],
    {
      fetch: ['posts.title', 'posts.subtitle', 'posts.author'],
      pageSize: 1,
    }
  );

  const paths = postsResponse.results.map(post => {
    return {
      params: {
        slug: post.uid,
      },
    };
  });

  return {
    paths,
    fallback: true,
  };
};

export const getStaticProps: GetStaticProps = async ({
  params,
  preview = false,
  previewData,
}) => {
  const { slug } = params;
  const prismic = getPrismicClient();
  const response = await prismic.getByUID('posts', String(slug), {
    ref: previewData?.ref ?? null,
  });

  const nextPost = await prismic.query(
    [Prismic.Predicates.at('document.type', 'posts')],
    {
      pageSize: 1,
      after: `${response.id}`,
      orderings: '[document.first_publication_date]',
    }
  );

  const prevPost = await prismic.query(
    [Prismic.Predicates.at('document.type', 'posts')],
    {
      pageSize: 1,
      after: `${response.id}`,
      orderings: '[document.first_publication_date desc]',
    }
  );

  const wasEdited = !!compareAsc(
    new Date(response.last_publication_date),
    new Date(response.first_publication_date)
  );

  return {
    props: {
      post: response,
      nextPost: nextPost?.results[0] || null,
      prevPost: prevPost?.results[0] || null,
      wasEdited,
      preview,
    },
    revalidate: 60 * 5, // 5 minutes
  };
};
