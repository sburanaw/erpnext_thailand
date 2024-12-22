from setuptools import find_packages, setup

with open("requirements.txt") as f:
	install_requires = f.read().strip().split("\n")

# get version from __version__ variable in erpnext_thailand/__init__.py
from erpnext_thailand import __version__ as version

setup(
	name="erpnext_thailand",
	version=version,
	description="Thailand Localization",
	author="Ecosoft",
	author_email="kittiu@ecosoft.co.th",
	packages=find_packages(),
	zip_safe=False,
	include_package_data=True,
	install_requires=install_requires,
)
