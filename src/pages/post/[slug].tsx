import { GetStaticPaths, GetStaticProps } from 'next';
import Head from 'next/head';
import { useRouter } from 'next/router';

import Prismic from '@prismicio/client';
import { RichText } from 'prismic-dom';

import { format } from 'date-fns';
import ptBR from 'date-fns/locale/pt-BR';

import { FiCalendar, FiUser, FiClock } from 'react-icons/fi';

import Header from '../../components/Header';

import { getPrismicClient } from '../../services/prismic';

import commonStyles from '../../styles/common.module.scss';
import styles from './post.module.scss';

interface Post {
  first_publication_date: string | null;
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
}

export default function Post({ post }: PostProps): JSX.Element {
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

export const getStaticProps: GetStaticProps = async ({ params }) => {
  const { slug } = params;
  const prismic = getPrismicClient();
  const response = await prismic.getByUID('posts', String(slug), {});

  return {
    props: {
      post: response,
    },
    revalidate: 60 * 5, // 5 minutes
  };
};
