from setuptools import setup

setup(
  name="segdex",
  version="0.1.0",
  description="Segregation Index",
  author=u"Jang Hyomin",
  author_email="seoul605.21@gmail.com",
  url="https://github.com/acheul/reardon-segregation-index",
  project_urls={
    "Source": "https://github.com/acheul/reardon-segregation-index",
  },
  download_url="https://github.com/acheul/reardon-segregation-index",
  license="MIT",
  keywords=["Segregation", "Segregation Index", "Reardon"],
  platforms="any",
  python_requires=">=3.8",
  install_requires = [
    'statsmodels>=0.14.1',
    'numpy >= 1.18.5',
    'pandas>=2.1.3',
    'scipy >= 1.7.0',
  ],
  classifiers=[
    'Development Status :: 4 - Beta',
    'Environment :: Console',
    'Intended Audience :: Science/Research',
    'Operating System :: OS Independent',
    'Programming Language :: Python :: 3.8',
    'Programming Language :: Python :: 3.9',
    'Programming Language :: Python :: 3.10',
    'Programming Language :: Python :: 3.11',
    'Programming Language :: Python :: 3 :: Only',
    'Topic :: Sociology'
  ]
)